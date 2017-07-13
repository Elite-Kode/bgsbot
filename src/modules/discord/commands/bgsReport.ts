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
                                this.db.model.faction.find({ faction_name_lower: { $in: primaryFactions } })
                                    .then(factions => {
                                        if (factions) {
                                            let embed = new discord.RichEmbed();
                                            embed.setTitle("BGS REPORT");
                                            embed.setColor([255, 100, 255]);
                                            factions.forEach(faction => {
                                                let factionAcronym = this.acronym(faction.faction_name);
                                                embed.addField(faction.faction_name, "------------", false);
                                                let factionPromiseArray = [];
                                                faction.faction_presence.forEach((faction) => {
                                                    let systemReport = "";
                                                    systemReport += `Current ${factionAcronym} Influence : ${(faction.influence * 100).toFixed(1)}%\n`;
                                                    systemReport += `Current ${factionAcronym} State : ${faction.state}\n`;
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
                                                    systemReport += `Pending ${factionAcronym} States : ${pendingStates}\n`;
                                                    secondaryFactions.forEach(otherFaction => {
                                                        factionPromiseArray.push(
                                                            new Promise((resolve, reject) => {
                                                                this.db.model.faction.findOne({ faction_name_lower: otherFaction })
                                                                    .then(otherFaction => {
                                                                        if (otherFaction) {
                                                                            let systems = otherFaction.faction_presence;
                                                                            let indexOfSystem = systems.findIndex(x => x.system_name === faction.system_name);
                                                                            if (indexOfSystem !== -1) {
                                                                                let factionAcronym = this.acronym(otherFaction.faction_name);
                                                                                let otherSystem = otherFaction.faction_presence[indexOfSystem];
                                                                                systemReport += `Current ${factionAcronym} Influence : ${(otherSystem.influence * 100).toFixed(1)}% (Currently in ${otherSystem.state})\n`;
                                                                            }
                                                                        }
                                                                        resolve(systemReport);
                                                                    })
                                                                    .catch(err => {
                                                                        reject(err);
                                                                    });
                                                            })
                                                        );
                                                    });
                                                    console.log(factionPromiseArray);
                                                    Promise.all(factionPromiseArray)
                                                        .then(systemReport => {
                                                            embed.addField(faction.system_name, systemReport);
                                                        })
                                                        .catch(err => {
                                                            console.log(err);
                                                        })
                                                });
                                            });
                                            embed.setTimestamp(new Date());
                                            message.channel.send({ embed })
                                                .catch(err => {
                                                    console.log(err);
                                                });
                                        } else {
                                            message.channel.send(Responses.getResponse(Responses.FAIL))
                                                .then(() => {
                                                    message.channel.send("You don't have any factions under monitoring");
                                                })
                                                .catch(err => {
                                                    console.log(err);
                                                });
                                        }
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

                    // this.db.model.system.findOne(
                    //     { system_name_lower: systemName })
                    //     .then(system => {
                    //         if (system) {
                    //             let embed = new discord.RichEmbed();
                    //             embed.setTitle("SYSTEM STATUS");
                    //             embed.setColor([255, 0, 255]);
                    //             if (system.faction_state === null) {
                    //                 system.faction_state = "None";
                    //             }
                    //             embed.addField(system.system_name, system.faction_state, false);
                    //             system.factions.forEach((faction) => {
                    //                 let factionDetail = "";
                    //                 factionDetail += `State : ${faction.faction_state}\n`;
                    //                 factionDetail += `Influence : ${(faction.faction_influence * 100).toFixed(1)}%\n`;
                    //                 let pendingStates: string = "";
                    //                 if (faction.faction_pending_states.length === 0) {
                    //                     pendingStates = "None";
                    //                 } else {
                    //                     faction.faction_pending_states.forEach((pendingState, index, factionPendingStates) => {
                    //                         let trend = this.getTrendIcon(pendingState.trend);
                    //                         pendingStates = `${pendingStates}${pendingState.state}${trend}`;
                    //                         if (index !== factionPendingStates.length - 1) {
                    //                             pendingStates = `${pendingStates}, `
                    //                         }
                    //                     });
                    //                 }
                    //                 factionDetail += `Pending States : ${pendingStates}\n`;
                    //                 let recoveringStates: string = "";
                    //                 if (faction.faction_recovering_states.length === 0) {
                    //                     recoveringStates = "None";
                    //                 } else {
                    //                     faction.faction_recovering_states.forEach((recoveringState, index, factionRecoveringState) => {
                    //                         let trend = this.getTrendIcon(recoveringState.trend);
                    //                         recoveringStates = `${recoveringStates}${recoveringState.state}${trend}`;
                    //                         if (index !== factionRecoveringState.length - 1) {
                    //                             recoveringStates = `${recoveringStates}, `
                    //                         }
                    //                     })
                    //                 }
                    //                 factionDetail += `Recovering States : ${recoveringStates}`;
                    //                 let factionName = faction.faction_name;
                    //                 if (system.system_faction === factionName) {
                    //                     factionName += "* CONTROLLING FACTION";
                    //                 }
                    //                 embed.addField(factionName, factionDetail, false)
                    //             });
                    //             embed.setTimestamp(new Date());
                    //             message.channel.send({ embed })
                    //                 .catch(err => {
                    //                     console.log(err);
                    //                 });
                    //         } else {
                    //             message.channel.send(Responses.getResponse(Responses.FAIL))
                    //                 .then(() => {
                    //                     message.channel.send("System is not monitored");
                    //                 })
                    //                 .catch(err => {
                    //                     console.log(err);
                    //                 });
                    //         }
                    //     })
                    //     .catch(err => {
                    //         message.channel.send(Responses.getResponse(Responses.FAIL));
                    //         console.log(err);
                    //     })
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
