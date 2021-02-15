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
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db';
import { Access } from '../access';
import { EBGSFactionsMinimal } from "../../../interfaces/typings";
import { Command } from "../../../interfaces/Command";
import axios, { AxiosRequestConfig } from "axios";

export class MonitorFactions implements Command {
    db: DB;
    dmAble = false;

    constructor() {
        this.db = App.db;
    }

    exec(message: Message, commandArguments: string): void {
        let argsArray: string[] = [];
        if (commandArguments.length !== 0) {
            argsArray = commandArguments.split(" ");
        }
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
    }

    checkAndMapAlias(command: string) {
        switch (command) {
            case 'a':
                return 'add';
            case 'ap':
                return 'addprimary';
            case 'r':
                return 'remove';
            case 'l':
                return 'list';
            default:
                return command;
        }
    }

    async add(message: Message, argsArray: string[], primary: boolean = false) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length >= 2) {
                let guildId = message.guild.id;
                let factionName = argsArray.slice(1).join(" ");
                let url = "https://elitebgs.app/api/ebgs/v5/factions";
                let requestOptions: AxiosRequestConfig = {
                    params: {
                        name: factionName,
                        minimal: true
                    }
                };

                let response = await axios.get(url, requestOptions);
                if (response.status == 200) {
                    let body: EBGSFactionsMinimal = response.data;
                    if (body.total === 0) {
                        try {
                            await message.channel.send(Responses.getResponse(Responses.FAIL));
                            message.channel.send("Faction not found");
                        } catch (err) {
                            App.bugsnagClient.call(err);
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
                                {guild_id: guildId},
                                {
                                    updated_at: new Date(),
                                    $addToSet: {monitor_factions: monitorFactions}
                                });
                            if (guild) {
                                message.channel.send(Responses.getResponse(Responses.SUCCESS));
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
                message.channel.send(Responses.getResponse(Responses.NOPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    addprimary(message: Message, argsArray: string[]) {
        this.add(message, argsArray, true);
    }

    async remove(message: Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length >= 2) {
                let guildId = message.guild.id;
                let factionName = argsArray.slice(1).join(" ").toLowerCase();

                try {
                    let guild = await this.db.model.guild.findOneAndUpdate(
                        {guild_id: guildId},
                        {
                            updated_at: new Date(),
                            $pull: {monitor_factions: {faction_name_lower: factionName}}
                        });
                    if (guild) {
                        message.channel.send(Responses.getResponse(Responses.SUCCESS));
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
            } else {
                message.channel.send(Responses.getResponse(Responses.NOPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    async list(message: Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length === 1) {
                let guildId = message.guild.id;

                try {
                    let guild = await this.db.model.guild.findOne({guild_id: guildId});
                    if (guild) {
                        if (guild.monitor_factions && guild.monitor_factions.length !== 0) {
                            let flags = Permissions.FLAGS;
                            if (message.guild.me.permissionsIn(message.channel).has([flags.EMBED_LINKS])) {
                                let embed = new MessageEmbed();
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
                                    App.bugsnagClient.call(err, {
                                        metaData: {
                                            guild: guild._id
                                        }
                                    });
                                }
                            } else {
                                try {
                                    message.channel.send(Responses.getResponse(Responses.EMBEDPERMISSION));
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
                                message.channel.send("You don't have any monitored faction set up");
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
            } else {
                message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    help(): [string, string, string, string[]] {
        return [
            'monitorfactions(aliases: mf)',
            'Adds a faction to monitor for displaying in the BGS Report. A faction can be optionally added as a primary for more detailed results',
            'monitorfactions <add|addprimary|remove|list> <faction name>\nmonitorfactions <a|ap|r|l> <faction name>',
            [
                '`@BGSBot monitorfactions add knights of karma`',
                '`@BGSBot mf a knights of karma`',
                '`@BGSBot monitorfactions addprimary knights of karma`',
                '`@BGSBot monitorfactions ap knights of karma`',
                '`@BGSBot monitorfactions remove knights of karma`',
                '`@BGSBot mf remove knights of karma`',
                '`@BGSBot monitorfactions list`'
            ]
        ];
    }
}
