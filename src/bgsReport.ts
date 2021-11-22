/*
 * Copyright 2021 Sayak Mukhopadhyay
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Job } from 'agenda';
import { MessageEmbed, TextChannel } from 'discord.js';
import { getTickData } from './tick';
import { BgsModel, IBgsSchema } from './schemas/bgs';
import { GuildNotSetupException, LoggingClient, Responses } from 'kodeblox';
import { Schema } from 'mongoose';
import { FDevIds, IngameIdsSchema } from './fDevIds';
import axios, { AxiosRequestConfig } from 'axios';
import { EBGSFactions, EBGSSystemsDetailed } from './typings/elitebgs';
import { FieldRecordSchema } from './typings/embed';
import moment from 'moment';
import { acronym, getTrendIcon } from './utilities';
import assert from 'assert';

export type BgsFunctionParams = {
  guildId: string;
  channel: TextChannel;
};

// Gets triggered as a callback from the scheduler so it needs to handle its own errors
export async function generateBgsReportCallback(job: Job): Promise<void> {
  if (!job.attrs.data) {
    throw new Error('Data not present in job');
  }
  const guildId = job.attrs.data['guildId'];
  const channel = job.attrs.data['channel'];
  try {
    const embedArray = await generateBgsReport(guildId);
    for (let index = 0; index < embedArray.length; index++) {
      await channel.send({ embeds: embedArray.slice(index, index + 1) });
    }
  } catch (err) {
    if (err instanceof GuildNotSetupException) {
      channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
    } else {
      channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
    }
  }
  return;
}

export async function generateBgsReport(guildId: string): Promise<MessageEmbed[]> {
  const tickTime = (await getTickData()).updated_at;
  const bgs = await BgsModel.findOne({ guild_id: new Schema.Types.ObjectId(guildId) });
  if (!bgs) {
    throw new GuildNotSetupException();
  }
  const fDevIds = await FDevIds.getIds();
  const primaryFactions: string[] = [];
  const secondaryFactions: string[] = [];
  const allMonitoredFactionsUsed: string[] = [];

  for (const faction of bgs.monitor_factions) {
    if (faction.primary) {
      primaryFactions.push(faction.faction_name);
      continue;
    }
    secondaryFactions.push(faction.faction_name);
  }
  const allMonitoredFactions = primaryFactions.concat(secondaryFactions);
  const primarySystems: string[] = [];
  const secondarySystems: string[] = [];

  for (const system of bgs.monitor_systems) {
    if (system.primary) {
      primarySystems.push(system.system_name);
      continue;
    }
    secondarySystems.push(system.system_name);
  }

  const primarySystemPromises = primarySystems.map((system) =>
    getPrimarySystems(
      system,
      primaryFactions,
      secondaryFactions,
      fDevIds,
      allMonitoredFactionsUsed,
      bgs as IBgsSchema, // For some reason not casting to the type is still considering bgs to be nullable
      tickTime
    )
  );

  const secondarySystemPromises = secondarySystems.map((system) =>
    getSecondarySystems(
      system,
      primaryFactions,
      secondaryFactions,
      fDevIds,
      allMonitoredFactionsUsed,
      bgs as IBgsSchema,
      tickTime
    )
  );

  const promises = await Promise.all([Promise.all(primarySystemPromises), Promise.all(secondarySystemPromises)]);

  const primaryFieldRecord = promises[0].map((promise) => ({
    fieldTitle: promise[0],
    fieldDescription: promise[1],
    influence: 0,
    name: promise[2]
  }));

  const secondaryFieldRecord = promises[1].map((promise) => ({
    fieldTitle: promise[0],
    fieldDescription: promise[1],
    influence: 0,
    name: promise[2]
  }));

  const unusedFactionFetchPromisesResolved = await Promise.all(
    allMonitoredFactions
      .filter((faction) => !allMonitoredFactionsUsed.includes(faction)) // Remove all used factions from all factions
      .map((faction) => getUnusedFactions(faction, fDevIds)) // Get data of the faction for all systems
  );

  const unusedFactionsDetails = unusedFactionFetchPromisesResolved.reduce(
    (unusedFactionsDetails, unusedFactionDetail) => {
      return unusedFactionsDetails.concat(unusedFactionDetail);
    },
    [] as [string, string, string, string, number][]
  );

  if (unusedFactionsDetails.length > 0) {
    unusedFactionsDetails.sort((a, b) => {
      return a[0].toLowerCase().localeCompare(b[0].toLowerCase());
    });
    let previousSystem = unusedFactionsDetails[0][0];
    const updateMoment = moment(unusedFactionsDetails[0][3]);
    const tickMoment = moment(tickTime);
    const suffix = updateMoment.isAfter(tickMoment) ? 'after' : 'before';
    let joined = `Last Updated : ${updateMoment.fromNow()}, ${updateMoment.from(
      tickMoment,
      true
    )} ${suffix} last detected tick \n`;
    for (const factionDetails of unusedFactionsDetails) {
      if (factionDetails[0].toLowerCase() === previousSystem.toLowerCase()) {
        joined += factionDetails[1];
        continue;
      }
      secondaryFieldRecord.push({
        fieldTitle: previousSystem,
        fieldDescription: joined,
        influence: 0,
        name: previousSystem
      });
      previousSystem = factionDetails[0];
      const updateMoment = moment(factionDetails[3]);
      const tickMoment = moment(tickTime);
      const suffix = updateMoment.isAfter(tickMoment) ? 'after' : 'before';
      joined =
        `Last Updated : ${updateMoment.fromNow()}, ${updateMoment.from(
          tickMoment,
          true
        )} ${suffix} last detected tick\n` + factionDetails[1];
    }
    secondaryFieldRecord.push({
      fieldTitle: previousSystem,
      fieldDescription: joined,
      influence: 0,
      name: previousSystem
    });
  }

  if (bgs.sort && bgs.sort_order && bgs.sort_order !== 0) {
    primaryFieldRecord.sort((a, b) => {
      assert(bgs !== null); // See https://github.com/microsoft/TypeScript/issues/46853
      if (bgs.sort === 'name') {
        if (bgs.sort_order === -1) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return 1;
          }
          if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return -1;
          }
          return 0;
        }
        if (bgs.sort_order === 1) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1;
          }
          if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return 1;
          }
          return 0;
        }
        return 0;
      }
      return 0;
    });
    secondaryFieldRecord.sort((a, b) => {
      assert(bgs !== null); // See https://github.com/microsoft/TypeScript/issues/46853
      if (bgs.sort === 'name') {
        if (bgs.sort_order === -1) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return 1;
          }
          if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return -1;
          }
          return 0;
        }
        if (bgs.sort_order === 1) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1;
          }
          if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return 1;
          }
          return 0;
        }
        return 0;
      }
      return 0;
    });
  }

  const fieldRecord = primaryFieldRecord.concat(secondaryFieldRecord);
  const pagedFields: FieldRecordSchema[][] = [];
  let fieldsInPage: FieldRecordSchema[] = [];
  let charactersPerPageCount = 0;
  for (let index = 0; index < fieldRecord.length; index++) {
    if (fieldsInPage.length < 24) {
      charactersPerPageCount += fieldRecord[index].fieldTitle.length + fieldRecord[index].fieldDescription.length;
    } else {
      pagedFields.push(fieldsInPage);
      fieldsInPage = [];
      charactersPerPageCount = 0;
      index--;
    }
    if (charactersPerPageCount < 5000) {
      fieldsInPage.push(fieldRecord[index]);
    } else {
      pagedFields.push(fieldsInPage);
      fieldsInPage = [];
      charactersPerPageCount = 0;
      index--;
    }
    if (index === fieldRecord.length - 1) {
      pagedFields.push(fieldsInPage);
      fieldsInPage = [];
      charactersPerPageCount = 0;
    }
  }
  const numberOfMessages = pagedFields.length;
  const embedArray: MessageEmbed[] = [];
  for (let index = 0; index < numberOfMessages; index++) {
    const embed = new MessageEmbed();
    if (index === 0) {
      embed.setTitle('BGS REPORT');
    } else {
      embed.setTitle(`BGS REPORT - continued - Pg ${index + 1}`);
    }
    embed.setColor([255, 0, 255]);
    embed.setTimestamp(new Date());

    for (const pagedField of pagedFields[index]) {
      embed.addField(pagedField.fieldTitle, pagedField.fieldDescription);
    }

    embedArray.push(embed);
  }
  return embedArray;
}

export async function getPrimarySystems(
  system: string,
  primaryFactions: string[],
  secondaryFactions: string[],
  fDevIds: IngameIdsSchema,
  allMonitoredFactionsUsed: string[],
  bgs: IBgsSchema,
  tickTime: string
): Promise<[string, string, string]> {
  const url = 'https://elitebgs.app/api/ebgs/v5/systems';
  const requestOptions: AxiosRequestConfig = {
    params: {
      name: system.toLowerCase(),
      factionDetails: true,
      factionHistory: true,
      count: 2
    }
  };
  const response = await axios.get<EBGSSystemsDetailed>(url, requestOptions);
  if (response.status != 200) {
    throw new Error(response.statusText);
  }
  const body = response.data;
  if (body.total === 0) {
    return [system, `${acronym(system)} System not found\n`, system];
  }
  const systemResponse = body.docs[0];
  let noFactionMonitoredInSystem = true;
  for (const faction of systemResponse.factions) {
    if (primaryFactions.indexOf(faction.name) !== -1 || secondaryFactions.indexOf(faction.name) !== -1) {
      noFactionMonitoredInSystem = false;
      break;
    }
  }
  const primaryFieldRecord: FieldRecordSchema[] = [];
  const secondaryFieldRecord: FieldRecordSchema[] = [];
  for (const faction of systemResponse.factions) {
    const factionName = faction.name;
    const influence = faction.faction_details.faction_presence.influence;
    const happiness = fDevIds.happiness[faction.faction_details.faction_presence.happiness].name;
    const activeStatesArray = faction.faction_details.faction_presence.active_states;
    const pendingStatesArray = faction.faction_details.faction_presence.pending_states;

    let activeStates = '';
    if (activeStatesArray.length === 0) {
      activeStates = 'None';
    } else {
      activeStatesArray.forEach((activeState, index, factionActiveStates) => {
        activeStates = `${activeStates}${fDevIds.state[activeState.state].name}`;
        if (index !== factionActiveStates.length - 1) {
          activeStates = `${activeStates}, `;
        }
      });
    }

    let pendingStates = '';
    if (pendingStatesArray.length === 0) {
      pendingStates = 'None';
    } else {
      pendingStatesArray.forEach((pendingState, index, factionPendingStates) => {
        const trend = getTrendIcon(pendingState.trend);
        pendingStates = `${pendingStates}${fDevIds.state[pendingState.state].name}${trend}`;
        if (index !== factionPendingStates.length - 1) {
          pendingStates = `${pendingStates}, `;
        }
      });
    }
    if (primaryFactions.indexOf(faction.name) !== -1) {
      allMonitoredFactionsUsed.push(faction.name);
      const filtered = systemResponse.faction_history.filter((factionEach) => {
        return factionEach.faction_name_lower === faction.name_lower;
      });
      let influenceDifference = 0;
      if (filtered.length === 2) {
        influenceDifference = influence - filtered[1].influence;
      }
      let influenceDifferenceText;
      if (influenceDifference > 0) {
        influenceDifferenceText = `📈${(influenceDifference * 100).toFixed(1)}%`;
      } else if (influenceDifference < 0) {
        influenceDifferenceText = `📉${(-influenceDifference * 100).toFixed(1)}%`;
      } else {
        influenceDifferenceText = `🔷${(influenceDifference * 100).toFixed(1)}%`;
      }
      let factionDetail = `Current ${acronym(factionName)} Influence : ${(influence * 100).toFixed(
        1
      )}%${influenceDifferenceText}\n`;
      factionDetail += `Current ${acronym(factionName)} Happiness : ${happiness}\n`;

      factionDetail += `Active ${acronym(factionName)} State : ${activeStates}\n`;
      factionDetail += `Pending ${acronym(factionName)} State : ${pendingStates}\n`;
      primaryFieldRecord.push({
        fieldTitle: '',
        fieldDescription: factionDetail,
        name: factionName,
        influence: influence
      });
      continue;
    }
    if (secondaryFactions.indexOf(faction.name) !== -1 || noFactionMonitoredInSystem) {
      if (secondaryFactions.indexOf(faction.name) !== -1) {
        allMonitoredFactionsUsed.push(faction.name);
      }
      const factionDetail = `Current ${acronym(factionName)} Influence : ${(influence * 100).toFixed(
        1
      )}% (Currently in ${activeStates}. Pending ${pendingStates}) and ${happiness}\n`;
      secondaryFieldRecord.push({
        fieldTitle: '',
        fieldDescription: factionDetail,
        name: factionName,
        influence: influence
      });
    }
  }
  if (bgs.sort && bgs.sort_order && bgs.sort_order !== 0) {
    primaryFieldRecord.sort((a, b) => {
      if (bgs.sort === 'name') {
        if (bgs.sort_order === -1) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return 1;
          }
          if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return -1;
          }
          return 0;
        }
        if (bgs.sort_order === 1) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1;
          }
          if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return 1;
          }
          return 0;
        }
        return 0;
      }
      if (bgs.sort === 'influence') {
        if (bgs.sort_order === -1) {
          return b.influence - a.influence;
        }
        if (bgs.sort_order === 1) {
          return a.influence - b.influence;
        }
        return 0;
      }
      return 0;
    });
    secondaryFieldRecord.sort((a, b) => {
      if (bgs.sort === 'name') {
        if (bgs.sort_order === -1) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return 1;
          }
          if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return -1;
          }
          return 0;
        }
        if (bgs.sort_order === 1) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1;
          }
          if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return 1;
          }
          return 0;
        }
        return 0;
      }
      if (bgs.sort === 'influence') {
        if (bgs.sort_order === -1) {
          return b.influence - a.influence;
        }
        if (bgs.sort_order === 1) {
          return a.influence - b.influence;
        }
        return 0;
      }
      return 0;
    });
  }
  const updateMoment = moment(systemResponse.updated_at);
  const tickMoment = moment(tickTime);
  const suffix = updateMoment.isAfter(tickMoment) ? 'after' : 'before';
  let joined = '';
  joined += `Last Updated : ${updateMoment.fromNow()}, ${updateMoment.from(
    tickMoment,
    true
  )} ${suffix} last detected tick \n`;
  primaryFieldRecord.concat(secondaryFieldRecord).forEach((record) => {
    joined += record.fieldDescription;
  });
  return [system, joined, system];
}

export async function getSecondarySystems(
  system: string,
  primaryFactions: string[],
  secondaryFactions: string[],
  fDevIds: IngameIdsSchema,
  allMonitoredFactionsUsed: string[],
  bgs: IBgsSchema,
  tickTime: string
): Promise<[string, string, string]> {
  const url = 'https://elitebgs.app/api/ebgs/v5/systems';
  const requestOptions: AxiosRequestConfig = {
    params: {
      name: system.toLowerCase(),
      factionDetails: true,
      factionHistory: true,
      count: 2
    }
  };
  const response = await axios.get<EBGSSystemsDetailed>(url, requestOptions);
  if (response.status != 200) {
    throw new Error(response.statusText);
  }
  const body = response.data;
  if (body.total === 0) {
    return [system, `${acronym(system)} System not found\n`, system];
  }
  const systemResponse = body.docs[0];
  let noFactionMonitoredInSystem = true;
  for (const faction of systemResponse.factions) {
    if (primaryFactions.indexOf(faction.name) !== -1 || secondaryFactions.indexOf(faction.name) !== -1) {
      noFactionMonitoredInSystem = false;
      break;
    }
  }
  const primaryFieldRecord: FieldRecordSchema[] = [];
  const secondaryFieldRecord: FieldRecordSchema[] = [];
  for (const faction of systemResponse.factions) {
    const factionName = faction.name;
    const influence = faction.faction_details.faction_presence.influence;
    const happiness = fDevIds.happiness[faction.faction_details.faction_presence.happiness].name;
    const activeStatesArray = faction.faction_details.faction_presence.active_states;
    const pendingStatesArray = faction.faction_details.faction_presence.pending_states;

    let activeStates = '';
    if (activeStatesArray.length === 0) {
      activeStates = 'None';
    } else {
      activeStatesArray.forEach((activeState, index, factionActiveStates) => {
        activeStates = `${activeStates}${fDevIds.state[activeState.state].name}`;
        if (index !== factionActiveStates.length - 1) {
          activeStates = `${activeStates}, `;
        }
      });
    }

    let pendingStates = '';
    if (pendingStatesArray.length === 0) {
      pendingStates = 'None';
    } else {
      pendingStatesArray.forEach((pendingState, index, factionPendingStates) => {
        const trend = getTrendIcon(pendingState.trend);
        pendingStates = `${pendingStates}${fDevIds.state[pendingState.state].name}${trend}`;
        if (index !== factionPendingStates.length - 1) {
          pendingStates = `${pendingStates}, `;
        }
      });
    }
    if (primaryFactions.indexOf(faction.name) !== -1) {
      allMonitoredFactionsUsed.push(faction.name);
      const factionDetail = `Current ${acronym(factionName)} Influence : ${(influence * 100).toFixed(
        1
      )}% (Currently in ${activeStates}. Pending ${pendingStates}) and ${happiness}\n`;
      primaryFieldRecord.push({
        fieldTitle: '',
        fieldDescription: factionDetail,
        name: factionName,
        influence: influence
      });
      continue;
    }
    if (secondaryFactions.indexOf(faction.name) !== -1 || noFactionMonitoredInSystem) {
      if (secondaryFactions.indexOf(faction.name) !== -1) {
        allMonitoredFactionsUsed.push(faction.name);
      }
      const factionDetail = `${acronym(factionName)} : ${(influence * 100).toFixed(
        1
      )}% (${activeStates}. Pending ${pendingStates}) ${happiness}\n`;
      secondaryFieldRecord.push({
        fieldTitle: '',
        fieldDescription: factionDetail,
        name: factionName,
        influence: influence
      });
    }
  }
  if (bgs.sort && bgs.sort_order && bgs.sort_order !== 0) {
    primaryFieldRecord.sort((a, b) => {
      if (bgs.sort === 'name') {
        if (bgs.sort_order === -1) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return 1;
          }
          if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return -1;
          }
          return 0;
        }
        if (bgs.sort_order === 1) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1;
          }
          if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return 1;
          }
          return 0;
        }
        return 0;
      }
      if (bgs.sort === 'influence') {
        if (bgs.sort_order === -1) {
          return b.influence - a.influence;
        }
        if (bgs.sort_order === 1) {
          return a.influence - b.influence;
        }
        return 0;
      }
      return 0;
    });
    secondaryFieldRecord.sort((a, b) => {
      if (bgs.sort === 'name') {
        if (bgs.sort_order === -1) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return 1;
          }
          if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return -1;
          }
          return 0;
        }
        if (bgs.sort_order === 1) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1;
          }
          if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return 1;
          }
          return 0;
        }
        return 0;
      }
      if (bgs.sort === 'influence') {
        if (bgs.sort_order === -1) {
          return b.influence - a.influence;
        }
        if (bgs.sort_order === 1) {
          return a.influence - b.influence;
        }
        return 0;
      }
      return 0;
    });
  }
  const updateMoment = moment(systemResponse.updated_at);
  const tickMoment = moment(tickTime);
  const suffix = updateMoment.isAfter(tickMoment) ? 'after' : 'before';
  let joined = '';
  joined += `Last Updated : ${updateMoment.fromNow()}, ${updateMoment.from(
    tickMoment,
    true
  )} ${suffix} last detected tick \n`;
  primaryFieldRecord.concat(secondaryFieldRecord).forEach((record) => {
    joined += record.fieldDescription;
  });
  return [system, joined, system];
}

export async function getUnusedFactions(
  faction: string,
  fDevIds: IngameIdsSchema
): Promise<[string, string, string, string, number][]> {
  const url = 'https://elitebgs.app/api/ebgs/v5/factions';
  const requestOptions: AxiosRequestConfig = {
    params: { name: faction.toLowerCase() }
  };
  const response = await axios.get<EBGSFactions>(url, requestOptions);
  if (response.status != 200) {
    throw new Error(response.statusText);
  }
  const body = response.data;
  if (body.total === 0) {
    return [];
  }
  const factionResponse = body.docs[0];
  const factionName = factionResponse.name;
  let influence = 0;
  let happiness = '';
  let activeStatesArray = [];
  let pendingStatesArray = [];
  const unusedFactionsDetails: [string, string, string, string, number][] = [];
  for (const systemElement of factionResponse.faction_presence) {
    influence = systemElement.influence;
    happiness = fDevIds.happiness[systemElement.happiness].name;
    activeStatesArray = systemElement.active_states;
    pendingStatesArray = systemElement.pending_states;
    let activeStates = '';
    if (activeStatesArray.length === 0) {
      activeStates = 'None';
    } else {
      activeStatesArray.forEach((activeState, index, factionActiveStates) => {
        activeStates = `${activeStates}${fDevIds.state[activeState.state].name}`;
        if (index !== factionActiveStates.length - 1) {
          activeStates = `${activeStates}, `;
        }
      });
    }

    let pendingStates = '';
    if (pendingStatesArray.length === 0) {
      pendingStates = 'None';
    } else {
      pendingStatesArray.forEach((pendingState, index, factionPendingStates) => {
        const trend = getTrendIcon(pendingState.trend);
        pendingStates = `${pendingStates}${fDevIds.state[pendingState.state].name}${trend}`;
        if (index !== factionPendingStates.length - 1) {
          pendingStates = `${pendingStates}, `;
        }
      });
    }
    const factionDetail = `${acronym(factionName)} : ${(influence * 100).toFixed(
      1
    )}% (${activeStates}. Pending ${pendingStates}) ${happiness}\n`;
    unusedFactionsDetails.push([
      systemElement.system_name,
      factionDetail,
      factionName,
      systemElement.updated_at,
      influence
    ]);
  }
  return unusedFactionsDetails;
}
