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

                    this.db.model.faction.findOne(
                        { faction_name_lower: factionName })
                        .then(faction => {
                            if (faction) {
                                let embed = new discord.RichEmbed();
                                embed.setTitle("FACTION STATUS");
                                embed.setColor([255, 100, 255]);
                                embed.addField(faction.faction_name, faction.faction_government, false);
                                faction.faction_presence.forEach((faction) => {
                                    let factionDetail = "";
                                    factionDetail += `State : ${faction.state}\n`;
                                    factionDetail += `Influence : ${(faction.influence * 100).toFixed(1)}%\n`;
                                    let pendingStates: string = "";
                                    if (faction.pending_states.length === 0) {
                                        pendingStates = "None";
                                    } else {
                                        faction.pending_states.forEach((pendingState, index, factionPendingStates) => {
                                            let trend = this.getTrendIcon(pendingState.trend);
                                            pendingStates = `${pendingStates}${pendingState.state}${trend}`;
                                            if (index !== factionPendingStates.length - 1) {
                                                pendingStates = `${pendingStates}, `
                                            }
                                        });
                                    }
                                    factionDetail += `Pending States : ${pendingStates}\n`;
                                    let recoveringStates: string = "";
                                    if (faction.recovering_states.length === 0) {
                                        recoveringStates = "None";
                                    } else {
                                        faction.recovering_states.forEach((recoveringState, index, factionRecoveringState) => {
                                            let trend = this.getTrendIcon(recoveringState.trend);
                                            recoveringStates = `${recoveringStates}${recoveringState.state}${trend}`;
                                            if (index !== factionRecoveringState.length - 1) {
                                                recoveringStates = `${recoveringStates}, `
                                            }
                                        })
                                    }
                                    factionDetail += `Recovering States : ${recoveringStates}`;
                                    let systemName = faction.system_name;
                                    // if (system.system_faction === factionName) {
                                    //     factionName += "* CONTROLLING FACTION";
                                    // }
                                    embed.addField(systemName, factionDetail, false)
                                });
                                embed.setTimestamp(new Date());
                                message.channel.send({ embed })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            } else {
                                message.channel.send(Responses.getResponse(Responses.FAIL))
                                    .then(() => {
                                        message.channel.send("Faction is not monitored");
                                    })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            }
                        })
                        .catch(err => {
                            message.channel.send(Responses.getResponse(Responses.FAIL));
                            console.log(err);
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
