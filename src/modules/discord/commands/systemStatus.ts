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

export class SystemStatus {
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
                if (argsArray.length >= 2) {
                    let systemName: string = argsArray.slice(1).join(" ").toLowerCase();

                    let requestOptions = {
                        url: "http://elitebgs.kodeblox.com/api/ebgs/v1/systems",
                        method: "GET",
                        auth: {
                            'user': 'guest',
                            'pass': 'secret',
                            'sendImmediately': true
                        },
                        qs: { name: systemName }
                    }

                    request(requestOptions, (error, response, body) => {
                        if (!error && response.statusCode == 200) {
                            let responseData: string = body;
                            if (responseData.length === 2) {
                                message.channel.send(Responses.getResponse(Responses.FAIL))
                                    .then(() => {
                                        message.channel.send("System not found");
                                    })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            } else {
                                let responseObject: object = JSON.parse(responseData);
                                let systemName = responseObject[0].name;
                                let systemNameLower = responseObject[0].name_lower;
                                let systemState = responseObject[0].state;
                                let controlling = responseObject[0].controlling_minor_faction;
                                let minorFactions = responseObject[0].minor_faction_presences;
                                let embed = new discord.RichEmbed();
                                embed.setTitle("SYSTEM STATUS");
                                embed.setColor([255, 0, 255]);
                                if (systemState === null) {
                                    systemState = "None";
                                }
                                embed.addField(systemName, systemState, false);
                                let factionPromises = [];
                                minorFactions.forEach((faction) => {
                                    let requestOptions = {
                                        url: "http://elitebgs.kodeblox.com/api/ebgs/v1/factions",
                                        method: "GET",
                                        auth: {
                                            'user': 'guest',
                                            'pass': 'secret',
                                            'sendImmediately': true
                                        },
                                        qs: {
                                            name: faction.name_lower,
                                            system: systemNameLower
                                        }
                                    }
                                    factionPromises.push(new Promise((resolve, reject) => {
                                        request(requestOptions, (error, response, body) => {
                                            if (!error && response.statusCode == 200) {
                                                let responseData: string = body;
                                                if (responseData.length === 2) {
                                                    resolve([faction.name, "Faction status not found"]);
                                                } else {
                                                    let responseObject: object = JSON.parse(responseData);
                                                    let factionName = responseObject[0].name;
                                                    let factionNameLower = responseObject[0].name_lower;
                                                    let state = responseObject[0].history[0].state;
                                                    let influence = responseObject[0].history[0].influence;
                                                    let pendingStatesArray = responseObject[0].history[0].pending_states;
                                                    let recoveringStatesArray = responseObject[0].history[0].recovering_states;

                                                    let factionDetail = "";
                                                    factionDetail += `State : ${state}\n`;
                                                    factionDetail += `Influence : ${(influence * 100).toFixed(1)}%\n`;

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
                                                    factionDetail += `Pending States : ${pendingStates}\n`;
                                                    let recoveringStates: string = "";
                                                    if (recoveringStatesArray.length === 0) {
                                                        recoveringStates = "None";
                                                    } else {
                                                        recoveringStatesArray.forEach((recoveringState, index, factionRecoveringState) => {
                                                            let trend = this.getTrendIcon(recoveringState.trend);
                                                            recoveringStates = `${recoveringStates}${recoveringState.state}${trend}`;
                                                            if (index !== factionRecoveringState.length - 1) {
                                                                recoveringStates = `${recoveringStates}, `
                                                            }
                                                        })
                                                    }
                                                    factionDetail += `Recovering States : ${recoveringStates}`;
                                                    if (controlling === factionNameLower) {
                                                        factionName += '* CONTROLLING FACTION';
                                                    }
                                                    resolve([factionName, factionDetail]);
                                                }
                                            }
                                        })
                                    }));
                                })

                                Promise.all(factionPromises)
                                    .then(fields => {
                                        fields.forEach(field => {
                                            embed.addField(field[0], field[1]);
                                        })
                                        embed.setTimestamp(new Date());
                                        message.channel.send({ embed })
                                            .catch(err => {
                                                console.log(err);
                                            });
                                    })
                                    .catch(err => {
                                        message.channel.send(Responses.getResponse(Responses.FAIL));
                                        console.log(err);
                                    })
                            }
                        }
                    })
                } else {
                    message.channel.send(Responses.getResponse(Responses.NOPARAMS));
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
}
