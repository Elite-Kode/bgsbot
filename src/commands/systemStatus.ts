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

import { Message, MessageEmbed } from 'discord.js';
import moment from 'moment';
import axios, { AxiosRequestConfig } from 'axios';
import { Access, ADMIN, Command, FORBIDDEN, GuildModel, IGuildSchema, LoggingClient, Responses } from 'kodeblox';
import { BGS } from '../accesses/bgs';
import { getTickData } from '../tick';
import { EBGSSystemsDetailed } from '../typings/elitebgs';
import { FDevIds } from '../fDevIds';
import { FieldRecordSchema } from '../typings/embed';
import { BgsModel, IBgsSchema } from '../schemas/bgs';
import assert from 'assert';

export class SystemStatus implements Command {
  respondDm = false;
  sendDm = true;
  respondAsDm: boolean;
  calls = ['systemstatus', 'ss'];
  dmCalls = ['systemstatusdm', 'ssdm'];
  arguments = {
    get: this.get.bind(this),
    g: this.get.bind(this)
  };

  constructor(respondAsDm: boolean) {
    this.respondAsDm = respondAsDm;
  }

  exec(message: Message, _commandArguments: string, argsArray: string[]): void {
    if (argsArray.length <= 0) {
      message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      return;
    }
    type ArgumentKeys = keyof typeof this.arguments;
    const allowedArguments = Object.keys(this.arguments) as Array<ArgumentKeys>;
    const command = argsArray[0].toLowerCase() as ArgumentKeys;
    if (!allowedArguments.includes(command)) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_COMMAND));
      return;
    }
    this.arguments[command](message, argsArray);
  }

  async get(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, BGS, FORBIDDEN]);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length < 2) {
      message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      return;
    }
    let systemName: string = argsArray.slice(1).join(' ').toLowerCase();

    const url = 'https://elitebgs.app/api/ebgs/v5/systems';
    const requestOptions: AxiosRequestConfig = {
      params: {
        name: systemName,
        factionDetails: true,
        factionHistory: true,
        count: 2
      }
    };

    const tick = (await getTickData()).updated_at;
    const response = await axios.get<EBGSSystemsDetailed>(url, requestOptions);
    if (response.status !== 200) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(response.statusText);
      return;
    }
    const body = response.data;
    if (body.total === 0) {
      await message.channel.send(Responses.getResponse(Responses.FAIL));
      message.channel.send('System not found');
      return;
    }
    const fDevIds = await FDevIds.getIds();
    const responseSystem = body.docs[0];
    systemName = responseSystem.name;
    let systemState = fDevIds.state[responseSystem.state].name;
    const controlling = responseSystem.controlling_minor_faction_id;
    const minorFactions = responseSystem.factions;
    const tickMoment = moment(tick);
    const updateMoment = moment(responseSystem.updated_at);
    const suffix = updateMoment.isAfter(tickMoment) ? 'after' : 'before';
    if (systemState === null) {
      systemState = 'None';
    }
    const fieldRecord: FieldRecordSchema[] = [];
    for (const faction of minorFactions) {
      const state = fDevIds.state[faction.faction_details.faction_presence.state].name;
      const influence = faction.faction_details.faction_presence.influence;
      const filtered = responseSystem.faction_history.filter((factionEach) => {
        return factionEach.faction_name_lower === faction.name_lower;
      });
      let influenceDifference = 0;
      if (filtered.length === 2) {
        influenceDifference = influence - filtered[1].influence;
      }
      const happiness = fDevIds.happiness[faction.faction_details.faction_presence.happiness].name;
      const activeStatesArray = faction.faction_details.faction_presence.active_states;
      const pendingStatesArray = faction.faction_details.faction_presence.pending_states;
      const recoveringStatesArray = faction.faction_details.faction_presence.recovering_states;
      let influenceDifferenceText;
      if (influenceDifference > 0) {
        influenceDifferenceText = `📈${(influenceDifference * 100).toFixed(1)}%`;
      } else if (influenceDifference < 0) {
        influenceDifferenceText = `📉${(-influenceDifference * 100).toFixed(1)}%`;
      } else {
        influenceDifferenceText = `🔷${(influenceDifference * 100).toFixed(1)}%`;
      }
      let factionDetail = `Last Updated : ${updateMoment.fromNow()}, ${updateMoment.from(
        tickMoment,
        true
      )} ${suffix} last detected tick \n`;
      factionDetail += `State : ${state}\n`;
      factionDetail += `Happiness: ${happiness}\n`;
      factionDetail += `Influence : ${(influence * 100).toFixed(1)}%${influenceDifferenceText}\n`;
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
      factionDetail += `Active States : ${activeStates}\n`;
      let pendingStates = '';
      if (pendingStatesArray.length === 0) {
        pendingStates = 'None';
      } else {
        pendingStatesArray.forEach((pendingState, index, factionPendingStates) => {
          const trend = this.getTrendIcon(pendingState.trend);
          pendingStates = `${pendingStates}${fDevIds.state[pendingState.state].name}${trend}`;
          if (index !== factionPendingStates.length - 1) {
            pendingStates = `${pendingStates}, `;
          }
        });
      }
      factionDetail += `Pending States : ${pendingStates}\n`;
      let recoveringStates = '';
      if (recoveringStatesArray.length === 0) {
        recoveringStates = 'None';
      } else {
        recoveringStatesArray.forEach((recoveringState, index, factionRecoveringState) => {
          const trend = this.getTrendIcon(recoveringState.trend);
          recoveringStates = `${recoveringStates}${fDevIds.state[recoveringState.state].name}${trend}`;
          if (index !== factionRecoveringState.length - 1) {
            recoveringStates = `${recoveringStates}, `;
          }
        });
      }
      factionDetail += `Recovering States : ${recoveringStates}`;
      let fieldTitle = faction.name;
      if (faction.faction_id === controlling) {
        fieldTitle += '👑';
      }
      fieldRecord.push({
        fieldTitle: fieldTitle,
        fieldDescription: factionDetail,
        name: faction.name,
        influence: faction.faction_details.faction_presence.influence
      });
    }
    let guild: IGuildSchema | null;
    try {
      guild = await GuildModel.findOne({ guild_id: message.guildId });
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (!guild) {
      message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
      return;
    }
    let bgs: IBgsSchema | null;
    try {
      bgs = await BgsModel.findOne({ guild_id: guild._id });
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (bgs && bgs.sort && bgs.sort_order && bgs.sort_order !== 0) {
      fieldRecord.sort((a, b) => {
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
    // Multipage is not needed for systems due to number of faction restriction but still keeping it
    const numberOfMessages = Math.ceil(fieldRecord.length / 24);
    for (let index = 0; index < numberOfMessages; index++) {
      const embed = new MessageEmbed();
      if (index === 0) {
        embed.setTitle('SYSTEM STATUS');
      } else {
        embed.setTitle(`SYSTEM STATUS - continued - Pg ${index + 1}`);
      }
      embed.setColor([255, 0, 255]);
      embed.addField(systemName, systemState, false);
      embed.setTimestamp(new Date());
      let limit = 0;
      if (fieldRecord.length > index * 24 + 24) {
        limit = index * 24 + 24;
      } else {
        limit = fieldRecord.length;
      }
      for (let recordIndex = index * 24; recordIndex < limit; recordIndex++) {
        embed.addField(fieldRecord[recordIndex].fieldTitle, fieldRecord[recordIndex].fieldDescription);
      }
      if (this.respondAsDm) {
        await message.channel.send("I have DM'd the result to you");
        message.author.send({ embeds: [embed] });
      } else {
        message.channel.send({ embeds: [embed] });
      }
    }
  }

  private getTrendIcon(trend: number): string {
    if (trend > 0) {
      return '⬆️';
    } else if (trend < 0) {
      return '⬇️';
    } else {
      return '↔️';
    }
  }

  help(): [string, string, string, string[]] {
    return [
      'systemStatus(aliases: ss), systemstatusdm(aliases: ssdm)',
      'Gets the details of a system',
      'systemStatus get <system name>\nsystemStatus g <system name>',
      [
        "`@BGSBot systemStatus get qa'wakana`",
        "`@BGSBot ss g qa'wakana`",
        "`@BGSBot ss get qa'wakana`",
        "`@BGSBot systemStatus g qa'wakana`",
        "`@BGSBot ssdm get qa'wakana`"
      ]
    ];
  }
}
