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

import { Message, MessageEmbed, Permissions } from 'discord.js';
import axios, { AxiosRequestConfig } from 'axios'
import * as moment from 'moment';
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db';
import { Access } from '../access';
import { EBGSSystemsDetailed, FieldRecordSchema } from "../../../interfaces/typings";
import { FdevIds } from '../../../fdevids';
import { Tick } from './tick';
import { Command } from "../../../interfaces/Command";

export class SystemStatus implements Command {
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
            default:
                return command;
        }
    }

    async get(message: Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length >= 2) {
                let flags = Permissions.FLAGS;
                if (message.guild.me.permissionsIn(message.channel).has([flags.EMBED_LINKS])) {
                    let systemName: string = argsArray.slice(1).join(" ").toLowerCase();

                    let url = "https://elitebgs.app/api/ebgs/v5/systems";
                    let requestOptions: AxiosRequestConfig = {
                        params: {
                            name: systemName,
                            factionDetails: true,
                            factionHistory: true,
                            count: 2
                        }
                    };

                    let tick = new Tick();
                    this.tickTime = (await tick.getTickData()).updated_at;
                    let response = await axios.get(url, requestOptions);
                    if (response.status == 200) {
                        let body: EBGSSystemsDetailed = response.data;
                        if (body.total === 0) {
                            try {
                                await message.channel.send(Responses.getResponse(Responses.FAIL));
                                message.channel.send("System not found");
                            } catch (err) {
                                App.bugsnagClient.call(err);
                            }
                        } else {
                            let fdevIds = await FdevIds.getIds();
                            let responseSystem = body.docs[0];
                            let systemName = responseSystem.name;
                            let systemState = fdevIds.state[responseSystem.state].name;
                            let controlling = responseSystem.controlling_minor_faction_id;
                            let minorFactions = responseSystem.factions;
                            let updateMoment = moment(responseSystem.updated_at);
                            let tickMoment = moment(this.tickTime);
                            let suffix = updateMoment.isAfter(tickMoment) ? "after" : "before";
                            if (systemState === null) {
                                systemState = "None";
                            }
                            try {
                                let fieldRecord: FieldRecordSchema[] = [];
                                minorFactions.forEach(faction => {
                                    let state = fdevIds.state[faction.faction_details.faction_presence.state].name;
                                    let influence = faction.faction_details.faction_presence.influence;
                                    let filtered = responseSystem.faction_history.filter(factionEach => {
                                        return factionEach.faction_name_lower === faction.name_lower;
                                    });
                                    let influenceDifference = 0;
                                    if (filtered.length === 2) {
                                        influenceDifference = influence - filtered[1].influence;
                                    }
                                    let happiness = fdevIds.happiness[faction.faction_details.faction_presence.happiness].name;
                                    let activeStatesArray = faction.faction_details.faction_presence.active_states;
                                    let pendingStatesArray = faction.faction_details.faction_presence.pending_states;
                                    let recoveringStatesArray = faction.faction_details.faction_presence.recovering_states;
                                    let influenceDifferenceText;
                                    if (influenceDifference > 0) {
                                        influenceDifferenceText = `📈${(influenceDifference * 100).toFixed(1)}%`;
                                    } else if (influenceDifference < 0) {
                                        influenceDifferenceText = `📉${(-influenceDifference * 100).toFixed(1)}%`;
                                    } else {
                                        influenceDifferenceText = `🔷${(influenceDifference * 100).toFixed(1)}%`;
                                    }
                                    let factionDetail = `Last Updated : ${updateMoment.fromNow()}, ${updateMoment.from(tickMoment, true)} ${suffix} last detected tick \n`;
                                    factionDetail += `State : ${state}\n`;
                                    factionDetail += `Happiness: ${happiness}\n`;
                                    factionDetail += `Influence : ${(influence * 100).toFixed(1)}%${influenceDifferenceText}\n`;
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
                                    factionDetail += `Active States : ${activeStates}\n`;
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
                                    factionDetail += `Pending States : ${pendingStates}\n`;
                                    let recoveringStates: string = "";
                                    if (recoveringStatesArray.length === 0) {
                                        recoveringStates = "None";
                                    } else {
                                        recoveringStatesArray.forEach((recoveringState, index, factionRecoveringState) => {
                                            let trend = this.getTrendIcon(recoveringState.trend);
                                            recoveringStates = `${recoveringStates}${fdevIds.state[recoveringState.state].name}${trend}`;
                                            if (index !== factionRecoveringState.length - 1) {
                                                recoveringStates = `${recoveringStates}, `
                                            }
                                        })
                                    }
                                    factionDetail += `Recovering States : ${recoveringStates}`;
                                    let fieldTitle = faction.name;
                                    if (faction.faction_id === controlling) {
                                        fieldTitle += '👑';
                                    }
                                    fieldRecord.push({
                                        fieldTitle: fieldTitle,
                                        fieldDescription: factionDetail,
                                        name: faction.name,
                                        influence: faction.faction_details.faction_presence.influence
                                    });
                                });
                                let guild = await this.db.model.guild.findOne({guild_id: message.guild.id});
                                if (guild) {
                                    if (guild.sort && guild.sort_order && guild.sort_order !== 0) {
                                        fieldRecord.sort((a, b) => {
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
                                    // Multipage is not needed for systems due to number of faction restriction but still keeping it
                                    let numberOfMessages = Math.ceil(fieldRecord.length / 24);
                                    for (let index = 0; index < numberOfMessages; index++) {
                                        let embed = new MessageEmbed();
                                        if (index === 0) {
                                            embed.setTitle("SYSTEM STATUS");
                                        } else {
                                            embed.setTitle(`SYSTEM STATUS - continued - Pg ${index + 1}`);
                                        }
                                        embed.setColor([255, 0, 255]);
                                        embed.addField(systemName, systemState, false);
                                        embed.setTimestamp(new Date());
                                        let limit = 0;
                                        if (fieldRecord.length > index * 24 + 24) {
                                            limit = index * 24 + 24;
                                        } else {
                                            limit = fieldRecord.length;
                                        }
                                        for (let recordIndex = index * 24; recordIndex < limit; recordIndex++) {
                                            embed.addField(fieldRecord[recordIndex].fieldTitle, fieldRecord[recordIndex].fieldDescription);
                                        }
                                        try {
                                            if (this.dm) {
                                                message.channel.send("I have DM'd the result to you");
                                                message.member.send(embed);
                                            } else {
                                                message.channel.send(embed);
                                            }
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
                        }
                    } else {
                        App.bugsnagClient.call(response.statusText);
                    }
                } else {
                    try {
                        message.channel.send(Responses.getResponse(Responses.EMBEDPERMISSION));
                    } catch (err) {
                        App.bugsnagClient.call(err);
                    }
                }
            } else {
                message.channel.send(Responses.getResponse(Responses.NOPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
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

    help(): [string, string, string, string[]] {
        return [
            'systemStatus(aliases: ss), systemstatusdm(aliases: ssdm)',
            'Gets the details of a system',
            'systemStatus get <system name>\nsystemStatus g <system name>',
            [
                '`@BGSBot systemStatus get qa\'wakana`',
                '`@BGSBot ss g qa\'wakana`',
                '`@BGSBot ss get qa\'wakana`',
                '`@BGSBot systemStatus g qa\'wakana`',
                '`@BGSBot ssdm get qa\'wakana`'
            ]
        ];
    }
}
