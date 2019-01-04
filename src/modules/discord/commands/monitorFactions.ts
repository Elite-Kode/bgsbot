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
import * as request from 'request-promise-native';
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db/index';
import { Access } from './../access';
import { EBGSFactionsV4WOHistory } from "../../../interfaces/typings";
import { OptionsWithUrl, FullResponse } from 'request-promise-native';

export class MonitorFactions {
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

    async add(message: discord.Message, argsArray: string[], primary: boolean = false) {
        try {
            await Access.has(message.member, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length >= 2) {
                let guildId = message.guild.id;
                let factionName = argsArray.slice(1).join(" ");
                let requestOptions: OptionsWithUrl = {
                    url: "https://elitebgs.app/api/ebgs/v4/factions",
                    qs: { name: factionName },
                    json: true,
                    resolveWithFullResponse: true
                }

                let response: FullResponse = await request.get(requestOptions);
                if (response.statusCode == 200) {
                    let body: EBGSFactionsV4WOHistory = response.body;
                    if (body.total === 0) {
                        try {
                            await message.channel.send(Responses.getResponse(Responses.FAIL));
                            message.channel.send("Faction not found");
                        } catch (err) {
                            App.bugsnagClient.client.notify(err);
                            console.log(err);
                        }
                    } else {
                        let responseFaction = body.docs[0];
                        let factionName = responseFaction.name;
                        let factionNameLower = responseFaction.name_lower;
                        let monitorFactions = {
                            faction_name: factionName,
                            faction_name_lower: factionNameLower,
                            primary: primary,
                        }
                        try {
                            let guild = await this.db.model.guild.findOneAndUpdate(
                                { guild_id: guildId },
                                {
                                    updated_at: new Date(),
                                    $addToSet: { monitor_factions: monitorFactions }
                                });
                            if (guild) {
                                message.channel.send(Responses.getResponse(Responses.SUCCESS));
                            } else {
                                try {
                                    await message.channel.send(Responses.getResponse(Responses.FAIL));
                                    message.channel.send(Responses.getResponse(Responses.GUILDNOTSETUP));
                                } catch (err) {
                                    App.bugsnagClient.client.notify(err, {
                                        metaData: {
                                            guild: guild._id
                                        }
                                    });
                                    console.log(err);
                                }
                            }
                        } catch (err) {
                            message.channel.send(Responses.getResponse(Responses.FAIL));
                            App.bugsnagClient.client.notify(err);
                            console.log(err);
                        }
                    }
                } else {
                    App.bugsnagClient.client.notify(response.statusMessage);
                    console.log(response.statusMessage);
                }
            } else {
                message.channel.send(Responses.getResponse(Responses.NOPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    addprimary(message: discord.Message, argsArray: string[]) {
        this.add(message, argsArray, true);
    }

    async remove(message: discord.Message, argsArray: string[]) {
        try {
            await Access.has(message.member, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length >= 2) {
                let guildId = message.guild.id;
                let factionName = argsArray.slice(1).join(" ").toLowerCase();

                try {
                    let guild = await this.db.model.guild.findOneAndUpdate(
                        { guild_id: guildId },
                        {
                            updated_at: new Date(),
                            $pull: { monitor_factions: { faction_name_lower: factionName } }
                        });
                    if (guild) {
                        message.channel.send(Responses.getResponse(Responses.SUCCESS));
                    } else {
                        try {
                            await message.channel.send(Responses.getResponse(Responses.FAIL));
                            message.channel.send(Responses.getResponse(Responses.GUILDNOTSETUP));
                        } catch (err) {
                            App.bugsnagClient.client.notify(err, {
                                metaData: {
                                    guild: guild._id
                                }
                            });
                            console.log(err);
                        }
                    }
                } catch (err) {
                    message.channel.send(Responses.getResponse(Responses.FAIL));
                    App.bugsnagClient.client.notify(err);
                    console.log(err);
                }
            } else {
                message.channel.send(Responses.getResponse(Responses.NOPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    async list(message: discord.Message, argsArray: string[]) {
        try {
            await Access.has(message.member, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length === 1) {
                let guildId = message.guild.id;

                try {
                    let guild = await this.db.model.guild.findOne({ guild_id: guildId });
                    if (guild) {
                        if (guild.monitor_factions && guild.monitor_factions.length !== 0) {
                            let embed = new discord.RichEmbed();
                            embed.setTitle("MONITORED FACTIONS");
                            embed.setColor([255, 0, 255]);
                            let factionList = "";
                            guild.monitor_factions.forEach(faction => {
                                factionList += `${faction.faction_name}`;
                                if (faction.primary) {
                                    factionList += ` | PRIMARY`;
                                }
                                factionList += `\n`;
                            });
                            embed.addField("Factions", factionList);
                            embed.setTimestamp(new Date());
                            try {
                                message.channel.send(embed);
                            } catch (err) {
                                App.bugsnagClient.client.notify(err, {
                                    metaData: {
                                        guild: guild._id
                                    }
                                });
                                console.log(err);
                            }
                        } else {
                            try {
                                await message.channel.send(Responses.getResponse(Responses.FAIL));
                                message.channel.send("You don't have any monitored faction set up");
                            } catch (err) {
                                App.bugsnagClient.client.notify(err, {
                                    metaData: {
                                        guild: guild._id
                                    }
                                });
                                console.log(err);
                            }
                        }
                    } else {
                        try {
                            await message.channel.send(Responses.getResponse(Responses.FAIL));
                            message.channel.send(Responses.getResponse(Responses.GUILDNOTSETUP));
                        } catch (err) {
                            App.bugsnagClient.client.notify(err, {
                                metaData: {
                                    guild: guild._id
                                }
                            });
                            console.log(err);
                        }
                    }
                } catch (err) {
                    message.channel.send(Responses.getResponse(Responses.FAIL));
                    App.bugsnagClient.client.notify(err);
                    console.log(err);
                }
            } else {
                message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    help() {
        return [
            'monitorfactions',
            'Adds a faction to monitor for displaying in the BGS Report. A faction can be optionally added as a primary for more detailed results',
            'monitorfactions <add|addprimary|remove|list> <faction name>',
            [
                '`@BGSBot monitorfactions add knights of karma`',
                '`@BGSBot monitorfactions addprimary knights of karma`',
                '`@BGSBot monitorfactions remove knights of karma`',
                '`@BGSBot monitorfactions list`'
            ]
        ];
    }
}
