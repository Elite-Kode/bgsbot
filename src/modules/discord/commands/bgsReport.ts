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

import * as discord from 'discord.js';
import * as request from 'request';
import * as moment from 'moment';
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db/index';
import { Access } from './../access';
import { EBGSFactionsV4WOHistory, EBGSSystemsV4WOHistory, FieldRecordSchema } from "../../../interfaces/typings";
import { OptionsWithUrl } from 'request';
import { RichEmbed } from 'discord.js';
import { AutoReport } from '../../cron/autoReport';

export class BGSReport {
    db: DB;
    constructor() {
        this.db = App.db;
    }
    exec(message: discord.Message, commandArguments: string): void {
        let argsArray: string[] = [];
        if (commandArguments.length !== 0) {
            argsArray = commandArguments.split(" ");
        }
        if (argsArray.length > 0) {
            let command = argsArray[0].toLowerCase();
            if (this[command]) {
                this[command](message, argsArray);
            } else {
                message.channel.send(Responses.getResponse(Responses.NOTACOMMAND));
            }
        } else {
            message.channel.send(Responses.getResponse(Responses.NOPARAMS));
        }
    }

    async get(message: discord.Message, argsArray: string[]) {
        try {
            await Access.has(message.member, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length === 1) {
                let guildId = message.guild.id;
                try {
                    let embedArray = await this.getBGSReportEmbed(guildId);
                    for (let index = 0; index < embedArray.length; index++) {
                        try {
                            await message.channel.send(embedArray[index]);
                        } catch (err) {
                            console.log(err);
                        }
                    }
                } catch (err) {
                    message.channel.send(Responses.getResponse(Responses.FAIL));
                    console.log(err);
                }
            } else if (argsArray.length > 1) {
                message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
            } else {
                message.channel.send(Responses.getResponse(Responses.NOPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    async settime(message: discord.Message, argsArray: string[]) {
        try {
            await Access.has(message.member, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
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
                            { guild_id: guildId },
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
                            { new: true });
                        if (guild) {
                            message.channel.send(Responses.getResponse(Responses.SUCCESS));
                            AutoReport.createJob(guild, message.client);
                        } else {
                            try {
                                await message.channel.send(Responses.getResponse(Responses.FAIL));
                                message.channel.send("Your guild is not set yet");
                            } catch (err) {
                                console.log(err);
                            }
                        }
                    } catch (err) {
                        message.channel.send(Responses.getResponse(Responses.FAIL));
                        console.log(err);
                    }
                } else {
                    try {
                        await message.channel.send(Responses.getResponse(Responses.FAIL));
                        message.channel.send("Time must be of the form HH:mm:ss");
                    } catch (err) {
                        console.log(err);
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

    async showtime(message: discord.Message, argsArray: string[]) {
        try {
            await Access.has(message.member, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length === 1) {
                let guildId = message.guild.id;

                try {
                    let guild = await this.db.model.guild.findOne({ guild_id: guildId });
                    if (guild) {
                        if (guild.bgs_time && guild.bgs_time.length !== 0) {
                            let embed = new discord.RichEmbed();
                            embed.setTitle("BGS Reporting Time");
                            embed.setColor([255, 0, 255]);
                            embed.addField("Ids and Names", `${guild.bgs_time} UTC`);
                            embed.setTimestamp(new Date());
                            try {
                                message.channel.send(embed);
                            } catch (err) {
                                console.log(err);
                            }
                        } else {
                            try {
                                await message.channel.send(Responses.getResponse(Responses.FAIL));
                                message.channel.send("You don't have a bgs reporting time set up");
                            } catch (err) {
                                console.log(err);
                            }
                        }
                    } else {
                        try {
                            await message.channel.send(Responses.getResponse(Responses.FAIL));
                            message.channel.send("Your guild is not set yet");
                        } catch (err) {
                            console.log(err);
                        }
                    }
                } catch (err) {
                    message.channel.send(Responses.getResponse(Responses.FAIL));
                    console.log(err);
                }
            } else {
                message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    async unsettime(message: discord.Message, argsArray: string[]) {
        try {
            await Access.has(message.member, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length === 1) {
                let guildId = message.guild.id;

                try {
                    let guild = await this.db.model.guild.findOneAndUpdate(
                        { guild_id: guildId },
                        {
                            updated_at: new Date(),
                            $unset: { bgs_time: 1 }
                        });
                    if (guild) {
                        message.channel.send(Responses.getResponse(Responses.SUCCESS));
                        AutoReport.deleteJob(guild, message.client);
                    } else {
                        try {
                            await message.channel.send(Responses.getResponse(Responses.FAIL));
                            message.channel.send("Your guild is not set yet");
                        } catch (err) {
                            console.log(err);
                        }
                    }
                } catch (err) {
                    message.channel.send(Responses.getResponse(Responses.FAIL));
                    console.log(err);
                }
            } else {
                message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    public async getBGSReportEmbed(guildId: string): Promise<RichEmbed[]> {
        try {
            let guild = await this.db.model.guild.findOne({ guild_id: guildId });
            if (guild) {
                let primaryFactions: string[] = [];
                let secondaryFactions: string[] = [];
                guild.monitor_factions.forEach(faction => {
                    if (faction.primary) {
                        primaryFactions.push(faction.faction_name);
                    } else {
                        secondaryFactions.push(faction.faction_name);
                    }
                });
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
                    primarySystemPromises.push(new Promise((resolve, reject) => {
                        let requestOptions: OptionsWithUrl = {
                            url: "http://elitebgs.kodeblox.com/api/ebgs/v4/systems",
                            method: "GET",
                            qs: { name: system.toLowerCase() },
                            json: true
                        }
                        request(requestOptions, (error, response, body: EBGSSystemsV4WOHistory) => {
                            if (!error && response.statusCode == 200) {
                                if (body.total === 0) {
                                    resolve([system, `${this.acronym(system)} System not found\n`, system]);
                                } else {
                                    let systemResponse = body.docs[0];
                                    let primaryFactionPromises: Promise<[string, string, number]>[] = [];
                                    let secondaryFactionPromises: Promise<[string, string, number]>[] = [];
                                    let noFactionMonitoredInSystem = true;
                                    for (let faction of systemResponse.factions) {
                                        if (primaryFactions.indexOf(faction.name) !== -1 || secondaryFactions.indexOf(faction.name) !== -1) {
                                            noFactionMonitoredInSystem = false;
                                            break;
                                        }
                                    }
                                    systemResponse.factions.forEach(faction => {
                                        if (primaryFactions.indexOf(faction.name) !== -1) {
                                            primaryFactionPromises.push(new Promise((resolve, reject) => {
                                                let requestOptions: OptionsWithUrl = {
                                                    url: "http://elitebgs.kodeblox.com/api/ebgs/v4/factions",
                                                    method: "GET",
                                                    qs: { name: faction.name_lower },
                                                    json: true
                                                }
                                                request(requestOptions, (error, response, body: EBGSFactionsV4WOHistory) => {
                                                    if (!error && response.statusCode == 200) {
                                                        if (body.total === 0) {
                                                            resolve([`${this.acronym(faction.name)} Faction not found\n`, faction.name, 0]);
                                                        } else {
                                                            let factionResponse = body.docs[0];
                                                            let systemIndex = factionResponse.faction_presence.findIndex(element => {
                                                                return element.system_name === system;
                                                            });
                                                            if (systemIndex !== -1) {
                                                                let factionName = factionResponse.name;
                                                                let state = "";
                                                                let influence = 0;
                                                                let pendingStatesArray = [];
                                                                factionResponse.faction_presence.forEach(systemElement => {
                                                                    if (systemElement.system_name_lower === system.toLowerCase()) {
                                                                        state = systemElement.state;
                                                                        influence = systemElement.influence;
                                                                        pendingStatesArray = systemElement.pending_states;
                                                                    }
                                                                });
                                                                let factionDetail = "";
                                                                factionDetail += `Current ${this.acronym(factionName)} Influence : ${(influence * 100).toFixed(1)}%\n`;
                                                                factionDetail += `Current ${this.acronym(factionName)} State : ${state}\n`;

                                                                let pendingStates: string = "";
                                                                if (pendingStatesArray.length === 0) {
                                                                    pendingStates = "None";
                                                                } else {
                                                                    pendingStatesArray.forEach((pendingState, index, factionPendingStates) => {
                                                                        let trend = this.getTrendIcon(pendingState.trend);
                                                                        pendingStates = `${pendingStates}${pendingState.state}${trend}`;
                                                                        if (index !== factionPendingStates.length - 1) {
                                                                            pendingStates = `${pendingStates}, `
                                                                        }
                                                                    });
                                                                }

                                                                factionDetail += `Pending ${this.acronym(factionName)} State : ${pendingStates}\n`;
                                                                resolve([factionDetail, factionName, influence]);
                                                            } else {
                                                                resolve([`${this.acronym(faction.name)} Faction not found\n`, "", 0]);
                                                            }
                                                        }
                                                    } else {
                                                        if (error) {
                                                            reject(error);
                                                        } else {
                                                            reject(response.statusMessage);
                                                        }
                                                    }
                                                });
                                            }));
                                        } else if (secondaryFactions.indexOf(faction.name) !== -1 || noFactionMonitoredInSystem) {
                                            secondaryFactionPromises.push(new Promise((resolve, reject) => {
                                                let requestOptions: OptionsWithUrl = {
                                                    url: "http://elitebgs.kodeblox.com/api/ebgs/v4/factions",
                                                    method: "GET",
                                                    qs: { name: faction.name_lower },
                                                    json: true
                                                }
                                                request(requestOptions, (error, response, body: EBGSFactionsV4WOHistory) => {
                                                    if (!error && response.statusCode == 200) {
                                                        if (body.total === 0) {
                                                            resolve([`${this.acronym(faction.name)} Faction not found\n`, faction.name, 0]);
                                                        } else {
                                                            let factionResponse = body.docs[0];
                                                            let systemIndex = factionResponse.faction_presence.findIndex(element => {
                                                                return element.system_name === system;
                                                            });
                                                            if (systemIndex !== -1) {
                                                                let factionName = factionResponse.name;
                                                                let state = "";
                                                                let influence = 0;
                                                                let pendingStatesArray = [];
                                                                factionResponse.faction_presence.forEach(systemElement => {
                                                                    if (systemElement.system_name_lower === system.toLowerCase()) {
                                                                        state = systemElement.state;
                                                                        influence = systemElement.influence;
                                                                        pendingStatesArray = systemElement.pending_states;
                                                                    }
                                                                });
                                                                let pendingStates: string = "";
                                                                if (pendingStatesArray.length === 0) {
                                                                    pendingStates = "None";
                                                                } else {
                                                                    pendingStatesArray.forEach((pendingState, index, factionPendingStates) => {
                                                                        let trend = this.getTrendIcon(pendingState.trend);
                                                                        pendingStates = `${pendingStates}${pendingState.state}${trend}`;
                                                                        if (index !== factionPendingStates.length - 1) {
                                                                            pendingStates = `${pendingStates}, `
                                                                        }
                                                                    });
                                                                }
                                                                let factionDetail = `Current ${this.acronym(factionName)} Influence : ${(influence * 100).toFixed(1)}% (Currently in ${state}. Pending ${pendingStates})\n`;
                                                                resolve([factionDetail, factionName, influence]);
                                                            } else {
                                                                resolve([`${this.acronym(faction.name)} Faction not found\n`, "", 0]);
                                                            }
                                                        }
                                                    } else {
                                                        if (error) {
                                                            reject(error);
                                                        } else {
                                                            reject(response.statusMessage);
                                                        }
                                                    }
                                                });
                                            }));
                                        }
                                    });
                                    Promise.all([Promise.all(primaryFactionPromises), Promise.all(secondaryFactionPromises)])
                                        .then(promises => {
                                            let primaryFieldRecord: FieldRecordSchema[] = [];
                                            let secondaryFieldRecord: FieldRecordSchema[] = [];
                                            promises[0].forEach(promise => {
                                                primaryFieldRecord.push({
                                                    fieldTitle: "",
                                                    fieldDescription: promise[0],
                                                    influence: promise[2],
                                                    name: promise[1]
                                                });
                                            });
                                            promises[1].forEach(promise => {
                                                secondaryFieldRecord.push({
                                                    fieldTitle: "",
                                                    fieldDescription: promise[0],
                                                    influence: promise[2],
                                                    name: promise[1]
                                                });
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
                                            joined += `Last Updated : ${moment(systemResponse.updated_at).fromNow()} \n`;
                                            primaryFieldRecord.concat(secondaryFieldRecord).forEach(record => {
                                                joined += record.fieldDescription;
                                            });
                                            resolve([system, joined, system]);
                                        })
                                        .catch(err => {
                                            reject(err);
                                        });
                                }
                            } else {
                                if (error) {
                                    reject(error);
                                } else {
                                    reject(response.statusMessage);
                                }
                            }
                        });
                    }));
                });
                secondarySystems.forEach(system => {
                    secondarySystemPromises.push(new Promise((resolve, reject) => {
                        let requestOptions: OptionsWithUrl = {
                            url: "http://elitebgs.kodeblox.com/api/ebgs/v4/systems",
                            method: "GET",
                            qs: { name: system.toLowerCase() },
                            json: true
                        }
                        request(requestOptions, (error, response, body: EBGSSystemsV4WOHistory) => {
                            if (!error && response.statusCode == 200) {
                                if (body.total === 0) {
                                    resolve([system, `${this.acronym(system)} System not found\n`, system]);
                                } else {
                                    let systemResponse = body.docs[0];
                                    let primaryFactionPromises: Promise<[string, string, number]>[] = [];
                                    let secondaryFactionPromises: Promise<[string, string, number]>[] = [];
                                    let noFactionMonitoredInSystem = true;
                                    for (let faction of systemResponse.factions) {
                                        if (primaryFactions.indexOf(faction.name) !== -1 || secondaryFactions.indexOf(faction.name) !== -1) {
                                            noFactionMonitoredInSystem = false;
                                            break;
                                        }
                                    }
                                    systemResponse.factions.forEach(faction => {
                                        if (primaryFactions.indexOf(faction.name) !== -1) {
                                            primaryFactionPromises.push(new Promise((resolve, reject) => {
                                                let requestOptions: OptionsWithUrl = {
                                                    url: "http://elitebgs.kodeblox.com/api/ebgs/v4/factions",
                                                    method: "GET",
                                                    qs: { name: faction.name_lower },
                                                    json: true
                                                }
                                                request(requestOptions, (error, response, body: EBGSFactionsV4WOHistory) => {
                                                    if (!error && response.statusCode == 200) {
                                                        if (body.total === 0) {
                                                            resolve([`${this.acronym(faction.name)} Faction not found\n`, faction.name, 0]);
                                                        } else {
                                                            let factionResponse = body.docs[0];
                                                            let systemIndex = factionResponse.faction_presence.findIndex(element => {
                                                                return element.system_name === system;
                                                            });
                                                            if (systemIndex !== -1) {
                                                                let factionName = factionResponse.name;
                                                                let state = "";
                                                                let influence = 0;
                                                                let pendingStatesArray = [];
                                                                factionResponse.faction_presence.forEach(systemElement => {
                                                                    if (systemElement.system_name_lower === system.toLowerCase()) {
                                                                        state = systemElement.state;
                                                                        influence = systemElement.influence;
                                                                        pendingStatesArray = systemElement.pending_states;
                                                                    }
                                                                });
                                                                let updatedAt = moment(systemResponse.updated_at);

                                                                let pendingStates: string = "";
                                                                if (pendingStatesArray.length === 0) {
                                                                    pendingStates = "None";
                                                                } else {
                                                                    pendingStatesArray.forEach((pendingState, index, factionPendingStates) => {
                                                                        let trend = this.getTrendIcon(pendingState.trend);
                                                                        pendingStates = `${pendingStates}${pendingState.state}${trend}`;
                                                                        if (index !== factionPendingStates.length - 1) {
                                                                            pendingStates = `${pendingStates}, `
                                                                        }
                                                                    });
                                                                }
                                                                let factionDetail = `Current ${this.acronym(factionName)} Influence : ${(influence * 100).toFixed(1)}% (Currently in ${state}. Pending ${pendingStates})\n`;
                                                                resolve([factionDetail, factionName, influence]);
                                                            } else {
                                                                resolve([`${this.acronym(faction.name)} Faction not found\n`, "", 0]);
                                                            }
                                                        }
                                                    } else {
                                                        if (error) {
                                                            reject(error);
                                                        } else {
                                                            reject(response.statusMessage);
                                                        }
                                                    }
                                                });
                                            }));
                                        } else if (secondaryFactions.indexOf(faction.name) !== -1 || noFactionMonitoredInSystem) {
                                            secondaryFactionPromises.push(new Promise((resolve, reject) => {
                                                let requestOptions: OptionsWithUrl = {
                                                    url: "http://elitebgs.kodeblox.com/api/ebgs/v4/factions",
                                                    method: "GET",
                                                    qs: { name: faction.name_lower },
                                                    json: true
                                                }
                                                request(requestOptions, (error, response, body: EBGSFactionsV4WOHistory) => {
                                                    if (!error && response.statusCode == 200) {
                                                        if (body.total === 0) {
                                                            resolve([`${this.acronym(faction.name)} Faction not found\n`, faction.name, 0]);
                                                        } else {
                                                            let factionResponse = body.docs[0];
                                                            let systemIndex = factionResponse.faction_presence.findIndex(element => {
                                                                return element.system_name === system;
                                                            });
                                                            if (systemIndex !== -1) {
                                                                let factionName = factionResponse.name;
                                                                let state = "";
                                                                let influence = 0;
                                                                let pendingStatesArray = [];
                                                                factionResponse.faction_presence.forEach(systemElement => {
                                                                    if (systemElement.system_name_lower === system.toLowerCase()) {
                                                                        state = systemElement.state;
                                                                        influence = systemElement.influence;
                                                                        pendingStatesArray = systemElement.pending_states;
                                                                    }
                                                                });
                                                                let pendingStates: string = "";
                                                                if (pendingStatesArray.length === 0) {
                                                                    pendingStates = "None";
                                                                } else {
                                                                    pendingStatesArray.forEach((pendingState, index, factionPendingStates) => {
                                                                        let trend = this.getTrendIcon(pendingState.trend);
                                                                        pendingStates = `${pendingStates}${pendingState.state}${trend}`;
                                                                        if (index !== factionPendingStates.length - 1) {
                                                                            pendingStates = `${pendingStates}, `
                                                                        }
                                                                    });
                                                                }
                                                                let factionDetail = `${this.acronym(factionName)} : ${(influence * 100).toFixed(1)}% (${state}. Pending ${pendingStates})\n`;
                                                                resolve([factionDetail, factionName, influence]);
                                                            } else {
                                                                resolve([`${this.acronym(faction.name)} Faction not found\n`, "", 0]);
                                                            }
                                                        }
                                                    } else {
                                                        if (error) {
                                                            reject(error);
                                                        } else {
                                                            reject(response.statusMessage);
                                                        }
                                                    }
                                                });
                                            }));
                                        }
                                    });
                                    Promise.all([Promise.all(primaryFactionPromises), Promise.all(secondaryFactionPromises)])
                                        .then(promises => {
                                            let primaryFieldRecord: FieldRecordSchema[] = [];
                                            let secondaryFieldRecord: FieldRecordSchema[] = [];
                                            promises[0].forEach(promise => {
                                                primaryFieldRecord.push({
                                                    fieldTitle: "",
                                                    fieldDescription: promise[0],
                                                    influence: promise[2],
                                                    name: promise[1]
                                                });
                                            });
                                            promises[1].forEach(promise => {
                                                secondaryFieldRecord.push({
                                                    fieldTitle: "",
                                                    fieldDescription: promise[0],
                                                    influence: promise[2],
                                                    name: promise[1]
                                                });
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
                                            joined += `Last Updated : ${moment(systemResponse.updated_at).fromNow()} \n`;
                                            primaryFieldRecord.concat(secondaryFieldRecord).forEach(record => {
                                                joined += record.fieldDescription;
                                            });
                                            resolve([system, joined, system]);
                                        })
                                        .catch(err => {
                                            reject(err);
                                        });
                                }
                            } else {
                                if (error) {
                                    reject(error);
                                } else {
                                    reject(response.statusMessage);
                                }
                            }
                        });
                    }));
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
                let embedArray: RichEmbed[] = [];
                for (let index = 0; index < numberOfMessages; index++) {
                    let embed = new discord.RichEmbed();
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
                throw "Your guild is not set yet";
            }
        } catch (err) {
            throw err;
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

    help() {
        return [
            'bgsreport',
            'Gets the BGS Report or sets, unsets, shows the time when the BGS Report will be automatically generated',
            'bgsreport <get|settime|showtime|unsettime> <time in UTC>',
            [
                '`@BGSBot bgsreport get`',
                '`@BGSBot bgsreport settime 15:25:36`',
                '`@BGSBot bgsreport showtime`',
                '`@BGSBot bgsreport unsettime`'
            ]
        ];
    }
}
