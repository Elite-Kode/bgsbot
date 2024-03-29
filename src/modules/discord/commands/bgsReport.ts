/*
 * KodeBlox Copyright 2017 Sayak Mukhopadhyay
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http: //www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Message, MessageEmbed, Permissions, TextChannel } from 'discord.js';
import * as moment from 'moment';
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db';
import { Access } from '../access';
import { EBGSFactions, EBGSSystemsDetailed, FieldRecordSchema } from "../../../interfaces/typings";
import { AutoReport } from '../../cron';
import { FdevIds } from '../../../fdevids';
import { Tick } from './tick';
import { Command } from "../../../interfaces/Command";
import axios, { AxiosRequestConfig } from "axios";

export class BGSReport implements Command {
    db: DB;
    tickTime: string;
    dm: boolean;
    dmAble = false;

    constructor(dm = false) {
        this.db = App.db;
        this.tickTime = "";
        this.dm = dm;
    }

    exec(message: Message, commandArguments: string): void {
        let argsArray: string[] = [];
        if (commandArguments.length !== 0) {
            argsArray = commandArguments.split(" ");
        }
        try {
            if (argsArray.length > 0) {
                let command = argsArray[0].toLowerCase();
                command = this.checkAndMapAlias(command);
                if (this[command]) {
                    this[command](message, argsArray);
                } else {
                    message.channel.send(Responses.getResponse(Responses.NOTACOMMAND));
                }
            } else {
                message.channel.send(Responses.getResponse(Responses.NOPARAMS));
            }
        } catch (err) {
            App.bugsnagClient.call(err);
        }
    }

    checkAndMapAlias(command: string) {
        switch (command) {
            case 'g':
                return 'get';
            case 'st':
                return 'settime';
            case 'sh':
                return 'showtime';
            case 'u':
                return 'unsettime';
            default:
                return command;
        }
    }

    async get(message: Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length === 1) {
                let guildId = message.guild.id;
                try {
                    let flags = Permissions.FLAGS;
                    if (message.guild.me.permissionsIn(message.channel).has([flags.EMBED_LINKS])) {
                        let embedArray = await this.getBGSReportEmbed(guildId, message.channel as TextChannel);
                        for (let index = 0; index < embedArray.length; index++) {
                            if (this.dm) {
                                message.channel.send("I have DM'd the result to you");
                                message.member.send(embedArray[index]);
                            } else {
                                message.channel.send(embedArray[index]);
                            }
                        }
                    } else {
                        try {
                            message.channel.send(Responses.getResponse(Responses.EMBEDPERMISSION));
                        } catch (err) {
                            App.bugsnagClient.call(err);
                        }
                    }
                } catch (err) {
                    message.channel.send(Responses.getResponse(Responses.FAIL));
                    App.bugsnagClient.call(err);
                }
            } else {
                message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    async settime(message: Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length === 2) {
                let guildId = message.guild.id;
                let time = argsArray[1].split(':').map(element => {
                    return parseInt(element);
                });
                if (time.length === 3
                    && time[0] >= 0 && time[0] < 24
                    && time[1] >= 0 && time[1] < 59
                    && time[2] >= 0 && time[2] < 59) {
                    try {
                        let guild = await this.db.model.guild.findOneAndUpdate(
                            {guild_id: guildId},
                            {
                                updated_at: new Date(),
                                bgs_time: time.map(element => {
                                    let elementString = element.toString();
                                    if (elementString.length === 1) {
                                        elementString = `0${elementString}`;
                                    }
                                    return elementString;
                                }).join(":")
                            },
                            {new: true});
                        if (guild) {
                            message.channel.send(Responses.getResponse(Responses.SUCCESS));
                            AutoReport.createJob(guild, message.client);
                        } else {
                            try {
                                await message.channel.send(Responses.getResponse(Responses.FAIL));
                                message.channel.send(Responses.getResponse(Responses.GUILDNOTSETUP));
                            } catch (err) {
                                App.bugsnagClient.call(err, {
                                    metaData: {
                                        guild: guild._id
                                    }
                                });
                            }
                        }
                    } catch (err) {
                        message.channel.send(Responses.getResponse(Responses.FAIL));
                        App.bugsnagClient.call(err);
                    }
                } else {
                    try {
                        await message.channel.send(Responses.getResponse(Responses.FAIL));
                        message.channel.send("Time must be of the form HH:mm:ss");
                    } catch (err) {
                        App.bugsnagClient.call(err);
                    }
                }
            } else if (argsArray.length > 2) {
                message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
            } else {
                message.channel.send(Responses.getResponse(Responses.NOPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    async showtime(message: Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length === 1) {
                let guildId = message.guild.id;

                try {
                    let guild = await this.db.model.guild.findOne({guild_id: guildId});
                    if (guild) {
                        if (guild.bgs_time && guild.bgs_time.length !== 0) {
                            let flags = Permissions.FLAGS;
                            if (message.guild.me.permissionsIn(message.channel).has([flags.EMBED_LINKS])) {
                                let embed = new MessageEmbed();
                                embed.setTitle("BGS Reporting Time");
                                embed.setColor([255, 0, 255]);
                                embed.addField("Ids and Names", `${guild.bgs_time} UTC`);
                                embed.setTimestamp(new Date());
                                try {
                                    message.channel.send(embed);
                                } catch (err) {
                                    App.bugsnagClient.call(err, {
                                        metaData: {
                                            guild: guild._id
                                        }
                                    });
                                }
                            } else {
                                try {
                                    await message.channel.send(Responses.getResponse(Responses.EMBEDPERMISSION));
                                    message.channel.send(guild.bgs_time);
                                } catch (err) {
                                    App.bugsnagClient.call(err, {
                                        metaData: {
                                            guild: guild._id
                                        }
                                    });
                                }
                            }
                        } else {
                            try {
                                await message.channel.send(Responses.getResponse(Responses.FAIL));
                                message.channel.send("You don't have a bgs reporting time set up");
                            } catch (err) {
                                App.bugsnagClient.call(err, {
                                    metaData: {
                                        guild: guild._id
                                    }
                                });
                            }
                        }
                    } else {
                        try {
                            await message.channel.send(Responses.getResponse(Responses.FAIL));
                            message.channel.send(Responses.getResponse(Responses.GUILDNOTSETUP));
                        } catch (err) {
                            App.bugsnagClient.call(err, {
                                metaData: {
                                    guild: guild._id
                                }
                            });
                        }
                    }
                } catch (err) {
                    message.channel.send(Responses.getResponse(Responses.FAIL));
                    App.bugsnagClient.call(err);
                }
            } else {
                message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    async unsettime(message: Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length === 1) {
                let guildId = message.guild.id;

                try {
                    let guild = await this.db.model.guild.findOneAndUpdate(
                        {guild_id: guildId},
                        {
                            updated_at: new Date(),
                            $unset: {bgs_time: 1}
                        });
                    if (guild) {
                        message.channel.send(Responses.getResponse(Responses.SUCCESS));
                        AutoReport.deleteJob(guild, message.client);
                    } else {
                        try {
                            await message.channel.send(Responses.getResponse(Responses.FAIL));
                            message.channel.send(Responses.getResponse(Responses.GUILDNOTSETUP));
                        } catch (err) {
                            App.bugsnagClient.call(err, {
                                metaData: {
                                    guild: guild._id
                                }
                            });
                        }
                    }
                } catch (err) {
                    message.channel.send(Responses.getResponse(Responses.FAIL));
                    App.bugsnagClient.call(err);
                }
            } else {
                message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    public async getBGSReportEmbed(guildId: string, channel: TextChannel): Promise<MessageEmbed[]> {
        try {
            let tick = new Tick();
            this.tickTime = (await tick.getTickData()).updated_at;
        } catch (err) {
            this.tickTime = "";
            App.bugsnagClient.call(err);
        }
        let guild = await this.db.model.guild.findOne({guild_id: guildId});
        if (guild) {
            let fdevIds = await FdevIds.getIds();
            let primaryFactions: string[] = [];
            let secondaryFactions: string[] = [];
            let allMonitoredFactionsUsed: string[] = [];
            guild.monitor_factions.forEach(faction => {
                if (faction.primary) {
                    primaryFactions.push(faction.faction_name);
                } else {
                    secondaryFactions.push(faction.faction_name);
                }
            });
            let allMonitoredFactions = primaryFactions.concat(secondaryFactions);
            let primarySystems: string[] = [];
            let secondarySystems: string[] = []
            guild.monitor_systems.forEach(system => {
                if (system.primary) {
                    primarySystems.push(system.system_name);
                } else {
                    secondarySystems.push(system.system_name);
                }
            });

            let primarySystemPromises: Promise<[string, string, string]>[] = [];
            let secondarySystemPromises: Promise<[string, string, string]>[] = [];

            primarySystems.forEach(system => {
                primarySystemPromises.push((async () => {
                    let url = "https://elitebgs.app/api/ebgs/v5/systems";
                    let requestOptions: AxiosRequestConfig = {
                        params: {
                            name: system.toLowerCase(),
                            factionDetails: true,
                            factionHistory: true,
                            count: 2
                        }
                    };
                    let response = await axios.get(url, requestOptions);
                    if (response.status == 200) {
                        let body: EBGSSystemsDetailed = response.data;
                        if (body.total === 0) {
                            return [system, `${this.acronym(system)} System not found\n`, system] as [string, string, string];
                        } else {
                            let systemResponse = body.docs[0];
                            let noFactionMonitoredInSystem = true;
                            for (let faction of systemResponse.factions) {
                                if (primaryFactions.indexOf(faction.name) !== -1 || secondaryFactions.indexOf(faction.name) !== -1) {
                                    noFactionMonitoredInSystem = false;
                                    break;
                                }
                            }
                            let primaryFieldRecord: FieldRecordSchema[] = [];
                            let secondaryFieldRecord: FieldRecordSchema[] = [];
                            systemResponse.factions.forEach(faction => {
                                let factionName = faction.name;
                                let influence = faction.faction_details.faction_presence.influence;
                                let happiness = fdevIds.happiness[faction.faction_details.faction_presence.happiness].name;
                                let activeStatesArray = faction.faction_details.faction_presence.active_states;
                                let pendingStatesArray = faction.faction_details.faction_presence.pending_states;

                                let activeStates: string = "";
                                if (activeStatesArray.length === 0) {
                                    activeStates = "None";
                                } else {
                                    activeStatesArray.forEach((activeState, index, factionActiveStates) => {
                                        activeStates = `${activeStates}${fdevIds.state[activeState.state].name}`;
                                        if (index !== factionActiveStates.length - 1) {
                                            activeStates = `${activeStates}, `
                                        }
                                    });
                                }

                                let pendingStates: string = "";
                                if (pendingStatesArray.length === 0) {
                                    pendingStates = "None";
                                } else {
                                    pendingStatesArray.forEach((pendingState, index, factionPendingStates) => {
                                        let trend = this.getTrendIcon(pendingState.trend);
                                        pendingStates = `${pendingStates}${fdevIds.state[pendingState.state].name}${trend}`;
                                        if (index !== factionPendingStates.length - 1) {
                                            pendingStates = `${pendingStates}, `
                                        }
                                    });
                                }
                                if (primaryFactions.indexOf(faction.name) !== -1) {
                                    allMonitoredFactionsUsed.push(faction.name);
                                    let filtered = systemResponse.faction_history.filter(factionEach => {
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
                                    let factionDetail = `Current ${this.acronym(factionName)} Influence : ${(influence * 100).toFixed(1)}%${influenceDifferenceText}\n`;
                                    factionDetail += `Current ${this.acronym(factionName)} Happiness : ${happiness}\n`;

                                    factionDetail += `Active ${this.acronym(factionName)} State : ${activeStates}\n`;
                                    factionDetail += `Pending ${this.acronym(factionName)} State : ${pendingStates}\n`;
                                    primaryFieldRecord.push({
                                        fieldTitle: "",
                                        fieldDescription: factionDetail,
                                        name: factionName,
                                        influence: influence
                                    });
                                } else if (secondaryFactions.indexOf(faction.name) !== -1 || noFactionMonitoredInSystem) {
                                    if (secondaryFactions.indexOf(faction.name) !== -1) {
                                        allMonitoredFactionsUsed.push(faction.name);
                                    }
                                    let factionDetail = `Current ${this.acronym(factionName)} Influence : ${(influence * 100).toFixed(1)}% (Currently in ${activeStates}. Pending ${pendingStates}) and ${happiness}\n`;
                                    secondaryFieldRecord.push({
                                        fieldTitle: "",
                                        fieldDescription: factionDetail,
                                        name: factionName,
                                        influence: influence
                                    });
                                }
                            });
                            if (guild.sort && guild.sort_order && guild.sort_order !== 0) {
                                primaryFieldRecord.sort((a, b) => {
                                    if (guild.sort === 'name') {
                                        if (guild.sort_order === -1) {
                                            if (a.name.toLowerCase() < b.name.toLowerCase()) {
                                                return 1;
                                            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                                return -1;
                                            } else {
                                                return 0;
                                            }
                                        } else if (guild.sort_order === 1) {
                                            if (a.name.toLowerCase() < b.name.toLowerCase()) {
                                                return -1;
                                            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        } else {
                                            return 0;
                                        }
                                    } else if (guild.sort === 'influence') {
                                        if (guild.sort_order === -1) {
                                            return b.influence - a.influence;
                                        } else if (guild.sort_order === 1) {
                                            return a.influence - b.influence;
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        return 0;
                                    }
                                });
                                secondaryFieldRecord.sort((a, b) => {
                                    if (guild.sort === 'name') {
                                        if (guild.sort_order === -1) {
                                            if (a.name.toLowerCase() < b.name.toLowerCase()) {
                                                return 1;
                                            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                                return -1;
                                            } else {
                                                return 0;
                                            }
                                        } else if (guild.sort_order === 1) {
                                            if (a.name.toLowerCase() < b.name.toLowerCase()) {
                                                return -1;
                                            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        } else {
                                            return 0;
                                        }
                                    } else if (guild.sort === 'influence') {
                                        if (guild.sort_order === -1) {
                                            return b.influence - a.influence;
                                        } else if (guild.sort_order === 1) {
                                            return a.influence - b.influence;
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        return 0;
                                    }
                                });
                            }
                            let joined = "";
                            let updateMoment = moment(systemResponse.updated_at);
                            let tickMoment = moment(this.tickTime);
                            let suffix = updateMoment.isAfter(tickMoment) ? "after" : "before";
                            joined += `Last Updated : ${updateMoment.fromNow()}, ${updateMoment.from(tickMoment, true)} ${suffix} last detected tick \n`;
                            primaryFieldRecord.concat(secondaryFieldRecord).forEach(record => {
                                joined += record.fieldDescription;
                            });
                            return [system, joined, system] as [string, string, string];
                        }
                    } else {
                        throw new Error(response.statusText);
                    }
                })());
            });
            secondarySystems.forEach(system => {
                secondarySystemPromises.push((async () => {
                    let url = "https://elitebgs.app/api/ebgs/v5/systems";
                    let requestOptions: AxiosRequestConfig = {
                        params: {
                            name: system.toLowerCase(),
                            factionDetails: true,
                            factionHistory: true,
                            count: 2
                        }
                    };
                    let response = await axios.get(url, requestOptions);
                    if (response.status == 200) {
                        let body: EBGSSystemsDetailed = response.data;
                        if (body.total === 0) {
                            return [system, `${this.acronym(system)} System not found\n`, system] as [string, string, string];
                        } else {
                            let systemResponse = body.docs[0];
                            let noFactionMonitoredInSystem = true;
                            for (let faction of systemResponse.factions) {
                                if (primaryFactions.indexOf(faction.name) !== -1 || secondaryFactions.indexOf(faction.name) !== -1) {
                                    noFactionMonitoredInSystem = false;
                                    break;
                                }
                            }
                            let primaryFieldRecord: FieldRecordSchema[] = [];
                            let secondaryFieldRecord: FieldRecordSchema[] = [];
                            systemResponse.factions.forEach(faction => {
                                let factionName = faction.name;
                                let influence = faction.faction_details.faction_presence.influence;
                                let happiness = fdevIds.happiness[faction.faction_details.faction_presence.happiness].name;
                                let activeStatesArray = faction.faction_details.faction_presence.active_states;
                                let pendingStatesArray = faction.faction_details.faction_presence.pending_states;

                                let activeStates: string = "";
                                if (activeStatesArray.length === 0) {
                                    activeStates = "None";
                                } else {
                                    activeStatesArray.forEach((activeState, index, factionActiveStates) => {
                                        activeStates = `${activeStates}${fdevIds.state[activeState.state].name}`;
                                        if (index !== factionActiveStates.length - 1) {
                                            activeStates = `${activeStates}, `
                                        }
                                    });
                                }

                                let pendingStates: string = "";
                                if (pendingStatesArray.length === 0) {
                                    pendingStates = "None";
                                } else {
                                    pendingStatesArray.forEach((pendingState, index, factionPendingStates) => {
                                        let trend = this.getTrendIcon(pendingState.trend);
                                        pendingStates = `${pendingStates}${fdevIds.state[pendingState.state].name}${trend}`;
                                        if (index !== factionPendingStates.length - 1) {
                                            pendingStates = `${pendingStates}, `
                                        }
                                    });
                                }
                                if (primaryFactions.indexOf(faction.name) !== -1) {
                                    allMonitoredFactionsUsed.push(faction.name);
                                    let factionDetail = `Current ${this.acronym(factionName)} Influence : ${(influence * 100).toFixed(1)}% (Currently in ${activeStates}. Pending ${pendingStates}) and ${happiness}\n`;
                                    primaryFieldRecord.push({
                                        fieldTitle: "",
                                        fieldDescription: factionDetail,
                                        name: factionName,
                                        influence: influence
                                    });
                                } else if (secondaryFactions.indexOf(faction.name) !== -1 || noFactionMonitoredInSystem) {
                                    if (secondaryFactions.indexOf(faction.name) !== -1) {
                                        allMonitoredFactionsUsed.push(faction.name);
                                    }
                                    let factionDetail = `${this.acronym(factionName)} : ${(influence * 100).toFixed(1)}% (${activeStates}. Pending ${pendingStates}) ${happiness}\n`;
                                    secondaryFieldRecord.push({
                                        fieldTitle: "",
                                        fieldDescription: factionDetail,
                                        name: factionName,
                                        influence: influence
                                    });
                                }
                            });
                            if (guild.sort && guild.sort_order && guild.sort_order !== 0) {
                                primaryFieldRecord.sort((a, b) => {
                                    if (guild.sort === 'name') {
                                        if (guild.sort_order === -1) {
                                            if (a.name.toLowerCase() < b.name.toLowerCase()) {
                                                return 1;
                                            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                                return -1;
                                            } else {
                                                return 0;
                                            }
                                        } else if (guild.sort_order === 1) {
                                            if (a.name.toLowerCase() < b.name.toLowerCase()) {
                                                return -1;
                                            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        } else {
                                            return 0;
                                        }
                                    } else if (guild.sort === 'influence') {
                                        if (guild.sort_order === -1) {
                                            return b.influence - a.influence;
                                        } else if (guild.sort_order === 1) {
                                            return a.influence - b.influence;
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        return 0;
                                    }
                                });
                                secondaryFieldRecord.sort((a, b) => {
                                    if (guild.sort === 'name') {
                                        if (guild.sort_order === -1) {
                                            if (a.name.toLowerCase() < b.name.toLowerCase()) {
                                                return 1;
                                            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                                return -1;
                                            } else {
                                                return 0;
                                            }
                                        } else if (guild.sort_order === 1) {
                                            if (a.name.toLowerCase() < b.name.toLowerCase()) {
                                                return -1;
                                            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        } else {
                                            return 0;
                                        }
                                    } else if (guild.sort === 'influence') {
                                        if (guild.sort_order === -1) {
                                            return b.influence - a.influence;
                                        } else if (guild.sort_order === 1) {
                                            return a.influence - b.influence;
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        return 0;
                                    }
                                });
                            }
                            let updateMoment = moment(systemResponse.updated_at);
                            let tickMoment = moment(this.tickTime);
                            let suffix = updateMoment.isAfter(tickMoment) ? "after" : "before";
                            let joined = "";
                            joined += `Last Updated : ${updateMoment.fromNow()}, ${updateMoment.from(tickMoment, true)} ${suffix} last detected tick \n`;
                            primaryFieldRecord.concat(secondaryFieldRecord).forEach(record => {
                                joined += record.fieldDescription;
                            });
                            return [system, joined, system] as [string, string, string];
                        }
                    } else {
                        throw new Error(response.statusText);
                    }
                })());
            });
            let promises = await Promise.all([Promise.all(primarySystemPromises), Promise.all(secondarySystemPromises)]);

            let primaryFieldRecord: FieldRecordSchema[] = [];
            let secondaryFieldRecord: FieldRecordSchema[] = [];
            promises[0].forEach(promise => {
                primaryFieldRecord.push({
                    fieldTitle: promise[0],
                    fieldDescription: promise[1],
                    influence: 0,
                    name: promise[2]
                });
            });
            promises[1].forEach(promise => {
                secondaryFieldRecord.push({
                    fieldTitle: promise[0],
                    fieldDescription: promise[1],
                    influence: 0,
                    name: promise[2]
                });
            });

            let unusedFactionFetchPromises: Promise<boolean>[] = [];
            let unusedFactionsDetails: [string, string, string, string, number][] = [];
            allMonitoredFactions.forEach(faction => {
                if (allMonitoredFactionsUsed.indexOf(faction) === -1) {
                    unusedFactionFetchPromises.push((async () => {
                        let url = "https://elitebgs.app/api/ebgs/v5/factions";
                        let requestOptions: AxiosRequestConfig = {
                            params: {name: faction.toLowerCase()}
                        };
                        let response = await axios.get(url, requestOptions);
                        if (response.status == 200) {
                            let body: EBGSFactions = response.data;
                            if (body.total === 0) {
                                return false;
                            } else {
                                let factionResponse = body.docs[0];
                                let factionName = factionResponse.name;
                                let influence = 0;
                                let happiness = "";
                                let activeStatesArray = [];
                                let pendingStatesArray = [];
                                factionResponse.faction_presence.forEach(systemElement => {
                                    influence = systemElement.influence;
                                    happiness = fdevIds.happiness[systemElement.happiness].name;
                                    activeStatesArray = systemElement.active_states;
                                    pendingStatesArray = systemElement.pending_states;
                                    let activeStates: string = "";
                                    if (activeStatesArray.length === 0) {
                                        activeStates = "None";
                                    } else {
                                        activeStatesArray.forEach((activeState, index, factionActiveStates) => {
                                            activeStates = `${activeStates}${fdevIds.state[activeState.state].name}`;
                                            if (index !== factionActiveStates.length - 1) {
                                                activeStates = `${activeStates}, `
                                            }
                                        });
                                    }

                                    let pendingStates: string = "";
                                    if (pendingStatesArray.length === 0) {
                                        pendingStates = "None";
                                    } else {
                                        pendingStatesArray.forEach((pendingState, index, factionPendingStates) => {
                                            let trend = this.getTrendIcon(pendingState.trend);
                                            pendingStates = `${pendingStates}${fdevIds.state[pendingState.state].name}${trend}`;
                                            if (index !== factionPendingStates.length - 1) {
                                                pendingStates = `${pendingStates}, `
                                            }
                                        });
                                    }
                                    let factionDetail = `${this.acronym(factionName)} : ${(influence * 100).toFixed(1)}% (${activeStates}. Pending ${pendingStates}) ${happiness}\n`;
                                    unusedFactionsDetails.push([systemElement.system_name, factionDetail, factionName, systemElement.updated_at, influence])
                                });
                                return true;
                            }
                        } else {
                            throw new Error(response.statusText);
                        }
                    })());
                }
            });
            await Promise.all(unusedFactionFetchPromises);
            if (unusedFactionsDetails.length > 0) {
                unusedFactionsDetails.sort((a, b) => {
                    return a[0].toLowerCase().localeCompare(b[0].toLowerCase())
                });
                let previousSystem = unusedFactionsDetails[0][0];
                let updateMoment = moment(unusedFactionsDetails[0][3]);
                let tickMoment = moment(this.tickTime);
                let suffix = updateMoment.isAfter(tickMoment) ? "after" : "before";
                let joined = `Last Updated : ${updateMoment.fromNow()}, ${updateMoment.from(tickMoment, true)} ${suffix} last detected tick \n`;
                unusedFactionsDetails.forEach(factionDetails => {
                    if (factionDetails[0].toLowerCase() === previousSystem.toLowerCase()) {
                        joined += factionDetails[1];
                    } else {
                        secondaryFieldRecord.push({
                            fieldTitle: previousSystem,
                            fieldDescription: joined,
                            influence: 0,
                            name: previousSystem
                        });
                        previousSystem = factionDetails[0];
                        let updateMoment = moment(factionDetails[3]);
                        let tickMoment = moment(this.tickTime);
                        let suffix = updateMoment.isAfter(tickMoment) ? "after" : "before";
                        joined = `Last Updated : ${updateMoment.fromNow()}, ${updateMoment.from(tickMoment, true)} ${suffix} last detected tick\n` + factionDetails[1];
                    }
                });
                secondaryFieldRecord.push({
                    fieldTitle: previousSystem,
                    fieldDescription: joined,
                    influence: 0,
                    name: previousSystem
                });
            }

            if (guild.sort && guild.sort_order && guild.sort_order !== 0) {
                primaryFieldRecord.sort((a, b) => {
                    if (guild.sort === 'name') {
                        if (guild.sort_order === -1) {
                            if (a.name.toLowerCase() < b.name.toLowerCase()) {
                                return 1;
                            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                return -1;
                            } else {
                                return 0;
                            }
                        } else if (guild.sort_order === 1) {
                            if (a.name.toLowerCase() < b.name.toLowerCase()) {
                                return -1;
                            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                return 1;
                            } else {
                                return 0;
                            }
                        } else {
                            return 0;
                        }
                    } else {
                        return 0;
                    }
                });
                secondaryFieldRecord.sort((a, b) => {
                    if (guild.sort === 'name') {
                        if (guild.sort_order === -1) {
                            if (a.name.toLowerCase() < b.name.toLowerCase()) {
                                return 1;
                            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                return -1;
                            } else {
                                return 0;
                            }
                        } else if (guild.sort_order === 1) {
                            if (a.name.toLowerCase() < b.name.toLowerCase()) {
                                return -1;
                            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                return 1;
                            } else {
                                return 0;
                            }
                        } else {
                            return 0;
                        }
                    } else {
                        return 0;
                    }
                });
            }
            let fieldRecord = primaryFieldRecord.concat(secondaryFieldRecord);
            let pagedFields: FieldRecordSchema[][] = [];
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
            let numberOfMessages = pagedFields.length;
            let embedArray: MessageEmbed[] = [];
            for (let index = 0; index < numberOfMessages; index++) {
                let embed = new MessageEmbed();
                if (index === 0) {
                    embed.setTitle("BGS REPORT");
                } else {
                    embed.setTitle(`BGS REPORT - continued - Pg ${index + 1}`);
                }
                embed.setColor([255, 0, 255]);
                embed.setTimestamp(new Date());

                for (let pagedField of pagedFields[index]) {
                    embed.addField(pagedField.fieldTitle, pagedField.fieldDescription);
                }

                embedArray.push(embed);
            }
            return embedArray;
        } else {
            await channel.send(Responses.getResponse(Responses.FAIL));
            channel.send(Responses.getResponse(Responses.GUILDNOTSETUP));
        }
    }

    private getTrendIcon(trend: number): string {
        if (trend > 0) {
            return "⬆️";
        } else if (trend < 0) {
            return "⬇️";
        } else {
            return "↔️";
        }
    }

    private acronym(text) {
        return text
            .split(/\s/)
            .reduce((accumulator, word) => accumulator + word.charAt(0), '');
    }

    help(): [string, string, string, string[]] {
        return [
            'bgsreport(aliases: brt), bgsreportdm(aliases: brtdm',
            'Gets the BGS Report or sets, unsets, shows the time when the BGS Report will be automatically generated',
            'bgsreport <get|settime|showtime|unsettime> <time in UTC>\nbgsreport <g|st|sh|u> <time in UTC>',
            [
                '`@BGSBot bgsreport get`',
                '`@BGSBot brt g`',
                '`@BGSBot brtdm g`',
                '`@BGSBot bgsreportdm g`',
                '`@BGSBot bgsreport settime 15:25:36`',
                '`@BGSBot bgsreport st 15:25:36`',
                '`@BGSBot bgsreport showtime`',
                '`@BGSBot brt showtime`',
                '`@BGSBot bgsreport unsettime`'
            ]
        ];
    }
}
