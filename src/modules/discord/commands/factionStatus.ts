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
import { EBGSFactionsV3WOHistory } from "../../../interfaces/typings";
import { OptionsWithUrl } from 'request';

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

                    let requestOptions: OptionsWithUrl = {
                        url: "http://elitebgs.kodeblox.com/api/ebgs/v3/factions",
                        method: "GET",
                        qs: { name: factionName },
                        json: true
                    }

                    request(requestOptions, (error, response, body: EBGSFactionsV3WOHistory) => {
                        if (!error && response.statusCode == 200) {
                            if (body.total === 0) {
                                message.channel.send(Responses.getResponse(Responses.FAIL))
                                    .then(() => {
                                        message.channel.send("Faction not found");
                                    })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            } else {
                                let responseFaction = body.docs[0];
                                let factionName = responseFaction.name;
                                let government = responseFaction.government;
                                let presence = responseFaction.faction_presence;
                                let embed = new discord.RichEmbed();
                                embed.setTitle("FACTION STATUS");
                                embed.setColor([255, 0, 255]);
                                embed.addField(factionName, government, false);
                                presence.forEach(system => {
                                    let systemName = system.system_name;
                                    let state = system.state;
                                    let influence = system.influence;
                                    let pendingStatesArray = system.pending_states;
                                    let recoveringStatesArray = system.recovering_states;
                                    let updatedAt = moment(responseFaction.updated_at);
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
                                    embed.addField(systemName, factionDetail);
                                });
                                embed.setTimestamp(new Date());
                                message.channel.send({ embed })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            }
                        } else {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log(response.statusMessage);
                            }
                        }
                    });
                }
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
}
