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

import * as request from 'request-promise-native';
import { FullResponse, OptionsWithUrl } from 'request-promise-native';
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db';
import { Access } from '../access';
import { Message, MessageEmbed, Permissions } from "discord.js";
import { EBGSSystemsMinimal } from "../../../interfaces/typings";
import { Command } from "../../../interfaces/Command";

export class MonitorSystems implements Command {
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
                let systemName = argsArray.slice(1).join(" ");
                let requestOptions: OptionsWithUrl = {
                    url: "https://elitebgs.app/api/ebgs/v5/systems",
                    qs: {
                        name: systemName,
                        minimal: true
                    },
                    json: true,
                    resolveWithFullResponse: true
                }

                let response: FullResponse = await request.get(requestOptions);
                if (response.statusCode == 200) {
                    let body: EBGSSystemsMinimal = response.body;
                    if (body.total === 0) {
                        try {
                            await message.channel.send(Responses.getResponse(Responses.FAIL));
                            message.channel.send("System not found");
                        } catch (err) {
                            App.bugsnagClient.call(err);
                        }
                    } else {
                        let responseSystem = body.docs[0];
                        let systemName = responseSystem.name;
                        let systemNameLower = responseSystem.name_lower;
                        let monitorSystems = {
                            system_name: systemName,
                            system_name_lower: systemNameLower,
                            primary: primary,
                            system_pos: {
                                x: responseSystem.x,
                                y: responseSystem.y,
                                z: responseSystem.z
                            }
                        }
                        try {
                            let guild = await this.db.model.guild.findOneAndUpdate(
                                {guild_id: guildId},
                                {
                                    updated_at: new Date(),
                                    $addToSet: {monitor_systems: monitorSystems}
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
                    App.bugsnagClient.call(response.statusMessage);
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
                let systemName = argsArray.slice(1).join(" ").toLowerCase();

                try {
                    let guild = await this.db.model.guild.findOneAndUpdate(
                        {guild_id: guildId},
                        {
                            updated_at: new Date(),
                            $pull: {monitor_systems: {system_name_lower: systemName}}
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
                        if (guild.monitor_systems && guild.monitor_systems.length !== 0) {
                            let flags = Permissions.FLAGS;
                            if (message.guild.me.permissionsIn(message.channel).has([flags.EMBED_LINKS])) {
                                let embed = new MessageEmbed();
                                embed.setTitle("MONITORED SYSTEMS");
                                embed.setColor([255, 0, 255]);
                                let systemList = "";
                                guild.monitor_systems.forEach(system => {
                                    systemList += `${system.system_name}`;
                                    if (system.primary) {
                                        systemList += ` | PRIMARY`;
                                    }
                                    systemList += `\n`;
                                });
                                embed.addField("Systems", systemList);
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
                                message.channel.send("You don't have any monitored system set up");
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
            'monitorsystems(aliases: ms)',
            'Adds a system to monitor for displaying in the BGS Report. A system can be optionally added as a primary for more detailed results',
            'monitorsystems <add|addprimary|remove|list> <system name>\nmonitorsystems <a|ap|r|l> <system name>',
            [
                '`@BGSBot monitorsystems add qa\'wakana`',
                '`@BGSBot ms a qa\'wakana`',
                '`@BGSBot monitorsystems addprimary qa\'wakana`',
                '`@BGSBot monitorsystems ap qa\'wakana`',
                '`@BGSBot monitorsystems remove qa\'wakana`',
                '`@BGSBot mf remove qa\'wakana`',
                '`@BGSBot monitorsystems list`'
            ]
        ];
    }
}
