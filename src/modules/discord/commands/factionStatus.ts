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

export class FactionStatus {
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
                    let factionName: string = argsArray.slice(1).join(" ").toLowerCase();

                    let requestOptions = {
                        url: "http://elitebgs.kodeblox.com/api/ebgs/v1/factions",
                        method: "GET",
                        auth: {
                            'user': 'guest',
                            'pass': 'secret',
                            'sendImmediately': true
                        },
                        qs: { name: factionName }
                    }

                    request(requestOptions, (error, response, body) => {
                        if (!error && response.statusCode == 200) {
                            let responseData: string = body;
                            if (responseData.length === 2) {
                                message.channel.send(Responses.getResponse(Responses.FAIL))
                                    .then(() => {
                                        message.channel.send("Faction not found");
                                    })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            } else {
                                let responseObject: object = JSON.parse(responseData);
                                let factionName = responseObject[0].name;
                                let factionNameLower = responseObject[0].name_lower;
                                let government = responseObject[0].government;
                                let presence = responseObject[0].faction_presence;
                                let embed = new discord.RichEmbed();
                                embed.setTitle("FACTION STATUS");
                                embed.setColor([255, 0, 255]);
                                embed.addField(factionName, government, false);
                                let historyPromises = [];
                                presence.forEach((system) => {
                                    let requestOptions = {
                                        url: "http://elitebgs.kodeblox.com/api/ebgs/v1/factions",
                                        method: "GET",
                                        auth: {
                                            'user': 'guest',
                                            'pass': 'secret',
                                            'sendImmediately': true
                                        },
                                        qs: {
                                            name: factionNameLower,
                                            system: system.system_name_lower
                                        }
                                    }
                                    historyPromises.push(new Promise((resolve, reject) => {
                                        request(requestOptions, (error, response, body) => {
                                            if (!error && response.statusCode == 200) {
                                                let responseData: string = body;
                                                if (responseData.length === 2) {
                                                    resolve([system.system_name, "Faction status not found"]);
                                                } else {
                                                    let responseObject: object = JSON.parse(responseData);
                                                    let systemName = responseObject[0].history[0].system;
                                                    let systemNameLower = responseObject[0].history[0].system_lower;
                                                    let state = responseObject[0].history[0].state;
                                                    let influence = responseObject[0].history[0].influence;
                                                    let pendingStatesArray = responseObject[0].history[0].pending_states;
                                                    let recoveringStatesArray = responseObject[0].history[0].recovering_states;
                                                    let updatedAt = moment(responseObject[0].history[0].updated_at);
                                                    let factionDetail = "";
                                                    factionDetail += `Last Updated : ${updatedAt.fromNow()} \n`;
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
                                                    resolve([systemName, factionDetail]);
                                                }
                                            } else {
                                                reject(error);
                                            }
                                        })
                                    }));
                                })

                                Promise.all(historyPromises)
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
