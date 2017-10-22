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
import { EBGSFactionsV3WOHistory, EBGSSystemsV3WOHistory } from "../../../interfaces/typings";
import { OptionsWithUrl } from 'request';

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

    get(message: discord.Message, argsArray: string[]): void {
        Access.has(message.member, [Access.ADMIN, Access.BGS, Access.FORBIDDEN])
            .then(() => {
                if (argsArray.length === 1) {
                    let guildId = message.guild.id;
                    this.db.model.guild.findOne({ guild_id: guildId })
                        .then(guild => {
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


                                let embed = new discord.RichEmbed();
                                embed.setTitle("BGS REPORT");
                                embed.setColor([255, 100, 255]);

                                let systemPromises: Promise<[string, string]>[] = [];

                                primarySystems.forEach(system => {
                                    systemPromises.push(new Promise((resolve, reject) => {
                                        let requestOptions: OptionsWithUrl = {
                                            url: "http://elitebgs.kodeblox.com/api/ebgs/v3/systems",
                                            method: "GET",
                                            qs: { name: system.toLowerCase() },
                                            json: true
                                        }
                                        request(requestOptions, (error, response, body: EBGSSystemsV3WOHistory) => {
                                            if (!error && response.statusCode == 200) {
                                                if (body.total === 0) {
                                                    resolve([system, `${this.acronym(system)} System not found\n`]);
                                                } else {
                                                    let systemResponse = body.docs[0];
                                                    let primaryFactionPromises: Promise<string>[] = [];
                                                    let secondaryFactionPromises: Promise<string>[] = [];
                                                    systemResponse.factions.forEach(faction => {
                                                        if (primaryFactions.indexOf(faction.name) !== -1) {
                                                            primaryFactionPromises.push(new Promise((resolve, reject) => {
                                                                let requestOptions: OptionsWithUrl = {
                                                                    url: "http://elitebgs.kodeblox.com/api/ebgs/v3/factions",
                                                                    method: "GET",
                                                                    qs: { name: faction.name_lower },
                                                                    json: true
                                                                }
                                                                request(requestOptions, (error, response, body: EBGSFactionsV3WOHistory) => {
                                                                    if (!error && response.statusCode == 200) {
                                                                        if (body.total === 0) {
                                                                            resolve(`${this.acronym(faction.name)} Faction not found\n`);
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
                                                                                let updatedAt = moment(factionResponse.updated_at);
                                                                                let factionDetail = "";
                                                                                factionDetail += `Last Updated : ${updatedAt.fromNow()} \n`;
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
                                                                                resolve(factionDetail);
                                                                            } else {
                                                                                resolve(`${this.acronym(faction.name)} Faction not found\n`);
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
                                                        } else if (secondaryFactions.indexOf(faction.name) !== -1) {
                                                            secondaryFactionPromises.push(new Promise((resolve, reject) => {
                                                                let requestOptions: OptionsWithUrl = {
                                                                    url: "http://elitebgs.kodeblox.com/api/ebgs/v3/factions",
                                                                    method: "GET",
                                                                    qs: { name: faction.name_lower },
                                                                    json: true
                                                                }
                                                                request(requestOptions, (error, response, body: EBGSFactionsV3WOHistory) => {
                                                                    if (!error && response.statusCode == 200) {
                                                                        if (body.total === 0) {
                                                                            resolve(`${this.acronym(faction)} Faction not found\n`);
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
                                                                                resolve(factionDetail);
                                                                            } else {
                                                                                resolve(`${this.acronym(faction.name)} Faction not found\n`);
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
                                                    Promise.all(primaryFactionPromises.concat(secondaryFactionPromises))
                                                        .then(details => {
                                                            resolve([system, details.join("")]);
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
                                Promise.all(systemPromises)
                                    .then(systems => {
                                        systems.forEach(system => {
                                            embed.addField(system[0], system[1]);
                                        });
                                        embed.setTimestamp(new Date());
                                        message.channel.send({ embed })
                                            .catch(err => {
                                                console.log(err);
                                            });
                                    })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            }
                        })
                        .catch(err => {
                            console.log(err);
                        });
                }
            })
            .catch(err => {
                console.log(err);
            });
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
}
