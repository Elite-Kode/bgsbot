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
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db/index';
import { Access } from './../access';

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
                                let primaryFactions = [];
                                let secondaryFactions = [];
                                guild.monitor_factions.forEach(faction => {
                                    if (faction.primary) {
                                        primaryFactions.push(faction.faction_name);
                                    } else {
                                        secondaryFactions.push(faction.faction_name);
                                    }
                                });
                                let primarySystems = [];
                                let secondarySystems = []
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

                                let systemPromises = [];

                                primarySystems.forEach(system => {
                                    let primaryFactionPromises = [];
                                    let secondaryFactionPromises = [];

                                    primaryFactions.forEach(faction => {
                                        let requestOptions = {
                                            url: "http://elitebgs.kodeblox.com/api/ebgs/v1/factions",
                                            method: "GET",
                                            auth: {
                                                'user': 'guest',
                                                'pass': 'secret',
                                                'sendImmediately': true
                                            },
                                            qs: {
                                                name: faction.toLowerCase(),
                                                system: system.toLowerCase()
                                            }
                                        }
                                        primaryFactionPromises.push(new Promise((resolve, reject) => {
                                            request(requestOptions, (error, response, body) => {
                                                if (!error && response.statusCode == 200) {
                                                    let responseData: string = body;
                                                    if (responseData.length === 2) {
                                                        resolve(`${this.acronym(faction)} Faction status not found\n`);
                                                    } else {
                                                        let responseObject: object = JSON.parse(responseData);
                                                        if (responseObject[0].history.length > 0) {
                                                            let factionName = responseObject[0].name;
                                                            let state = responseObject[0].history[0].state;
                                                            let influence = responseObject[0].history[0].influence;
                                                            let pendingStatesArray = responseObject[0].history[0].pending_states;

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
                                                            resolve(factionDetail);
                                                        } else {
                                                            resolve("");
                                                        }
                                                    }
                                                } else {
                                                    reject(error);
                                                }
                                            })
                                        }));
                                    });
                                    secondaryFactions.forEach(faction => {
                                        let requestOptions = {
                                            url: "http://elitebgs.kodeblox.com/api/ebgs/v1/factions",
                                            method: "GET",
                                            auth: {
                                                'user': 'guest',
                                                'pass': 'secret',
                                                'sendImmediately': true
                                            },
                                            qs: {
                                                name: faction.toLowerCase(),
                                                system: system.toLowerCase()
                                            }
                                        }
                                        secondaryFactionPromises.push(new Promise((resolve, reject) => {
                                            request(requestOptions, (error, response, body) => {
                                                if (!error && response.statusCode == 200) {
                                                    let responseData: string = body;
                                                    if (responseData.length === 2) {
                                                        resolve(`${this.acronym(faction)} Faction status not found\n`);
                                                    } else {
                                                        let responseObject: object = JSON.parse(responseData);
                                                        if (responseObject[0].history.length > 0) {
                                                            let factionName = responseObject[0].name;
                                                            let state = responseObject[0].history[0].state;
                                                            let influence = responseObject[0].history[0].influence;
                                                            let pendingStatesArray = responseObject[0].history[0].pending_states;

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
                                                            resolve("");
                                                        }
                                                    }
                                                } else {
                                                    reject(error);
                                                }
                                            })
                                        }))
                                    });

                                    let factionPromises = [];
                                    factionPromises.push(new Promise((resolve, reject) => {
                                        Promise.all(primaryFactionPromises)
                                            .then(fields => {
                                                resolve(fields);
                                            })
                                            .catch(err => {
                                                reject(err);
                                            })
                                    }));
                                    factionPromises.push(new Promise((resolve, reject) => {
                                        Promise.all(secondaryFactionPromises)
                                            .then(fields => {
                                                resolve(fields);
                                            })
                                            .catch(err => {
                                                reject(err);
                                            })
                                    }));

                                    systemPromises.push(new Promise((resolve, reject) => {
                                        Promise.all(factionPromises)
                                            .then(fields => {
                                                let primarySystems: string[] = fields[0];
                                                let secondarySystems: string[] = fields[1];
                                                let output = "";
                                                primarySystems.forEach(primarySystem => {
                                                    output += primarySystem;
                                                });
                                                secondarySystems.forEach(secondarySystem => {
                                                    output += secondarySystem;
                                                });
                                                resolve([system, output]);
                                            })
                                            .catch(err => {
                                                reject(err);
                                            })
                                    }))
                                });
                                Promise.all(systemPromises)
                                    .then(fields => {
                                        fields.forEach(field => {
                                            embed.addField(field[0], field[1]);
                                        });
                                        embed.setTimestamp(new Date());
                                        message.channel.send({ embed })
                                            .catch(err => {
                                                console.log(err);
                                            });
                                    });
                            } else {
                                message.channel.send(Responses.getResponse(Responses.FAIL))
                                    .then(() => {
                                        message.channel.send("Your guild is not set yet");
                                    })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            }
                        });
                } else {
                    message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
                }
            })
            .catch(() => {
                message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
            })
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
