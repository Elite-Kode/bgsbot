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

                    this.db.model.system.findOne(
                        { system_name_lower: systemName })
                        .then(system => {
                            if (system) {
                                let embed = new discord.RichEmbed();
                                embed.setTitle(system.system_name);
                                embed.setColor([255, 0, 255]);
                                embed.addField("State", system.faction_state, true);
                                embed.addField("System Security", system.system_security, true);
                                embed.addField("No of Factions in system", system.factions.length);
                                embed.addField("Status of factions", "----------------", false);
                                system.factions.forEach((faction) => {
                                    embed.addField(faction.faction_name, "----------------", false);
                                    embed.addField("Influence", faction.faction_influence, true)
                                    embed.addField("State", faction.faction_state, true);
                                    let pendingStates: string = "";
                                    if (faction.faction_pending_states.length === 0) {
                                        pendingStates = "None";
                                    } else {
                                        faction.faction_pending_states.forEach((pendingState, index, factionPendingStates) => {
                                            let trend = this.getTrendIcon(pendingState.trend);
                                            pendingStates = `${pendingStates}${pendingState.state}${trend}`;
                                            if (index !== factionPendingStates.length - 1) {
                                                pendingStates = `${pendingStates}, `
                                            }
                                        });
                                    }
                                    embed.addField("Pending States", pendingStates, false);
                                    let recoveringStates: string = "";
                                    if (faction.faction_recovering_states.length === 0) {
                                        recoveringStates = "None";
                                    } else {
                                        faction.faction_recovering_states.forEach((recoveringState, index, factionRecoveringState) => {
                                            let trend = this.getTrendIcon(recoveringState.trend);
                                            recoveringStates = `${recoveringStates}${recoveringState.state}${trend}`;
                                            if (index !== factionRecoveringState.length - 1) {
                                                recoveringStates = `${recoveringStates}, `
                                            }
                                        })
                                    }
                                    embed.addField("Recovering States", recoveringStates, true);
                                    embed.setTimestamp(system.created_at);
                                });
                                message.channel.send({ embed })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            } else {
                                message.channel.send(Responses.getResponse(Responses.FAIL))
                                    .then(() => {
                                        message.channel.send("System is not monitored");
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
                } else if (argsArray.length > 2) {
                    message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
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
