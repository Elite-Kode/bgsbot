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
import { Command } from "../../../interfaces/Command";

export class BGSRole implements Command {
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
            case 's':
                return 'set';
            case 'r':
                return 'remove';
            case 'sh':
                return 'show';
            default:
                return command;
        }
    }

    async set(message: Message, argsArray: string[]) {
        this.add(message, argsArray)
    }

    async add(message: Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.FORBIDDEN]);
            if (argsArray.length === 2) {
                let guildId = message.guild.id;
                let bgsRoleId = argsArray[1];
                if (message.guild.roles.cache.has(bgsRoleId)) {

                    try {
                        let guild = await this.db.model.guild.findOneAndUpdate(
                            {guild_id: guildId},
                            {
                                updated_at: new Date(),
                                $addToSet: {bgs_roles_id: bgsRoleId}
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
                    message.channel.send(Responses.getResponse(Responses.IDNOTFOUND));
                }
            } else if (argsArray.length > 2) {
                message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
            } else {
                message.channel.send(Responses.getResponse(Responses.NOPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    async remove(message: Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.FORBIDDEN]);
            if (argsArray.length === 1) {
                let guildId = message.guild.id;
                let bgsRoleId = argsArray[1];

                try {
                    let guild = await this.db.model.guild.findOneAndUpdate(
                        {guild_id: guildId},
                        {
                            updated_at: new Date(),
                            $pull: {bgs_roles_id: bgsRoleId}
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
                message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    async show(message: Message, argsArray: string[]) {
        this.list(message, argsArray)
    }

    async list(message: Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.FORBIDDEN]);
            if (argsArray.length === 1) {
                let guildId = message.guild.id;

                try {
                    let guild = await this.db.model.guild.findOne({guild_id: guildId});
                    if (guild) {
                        if (guild.bgs_roles_id && guild.bgs_roles_id.length !== 0) {
                            let flags = Permissions.FLAGS;
                            if (message.guild.me.permissionsIn(message.channel).has([flags.EMBED_LINKS])) {
                                let embed = new MessageEmbed();
                                embed.setTitle("BGS Role");
                                embed.setColor([255, 0, 255]);
                                let idList = "";
                                guild.bgs_roles_id.forEach(id => {
                                    if (message.guild.roles.cache.has(id)) {
                                        idList = `${id} - @${message.guild.roles.cache.get(id).name}\n`;
                                    } else {
                                        idList = `${id} - Does not exist in Discord. Please delete this from BGSBot`;
                                    }
                                });
                                embed.addField("Ids and Names", idList);
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
                                    await message.channel.send(Responses.getResponse(Responses.EMBEDPERMISSION));
                                    message.channel.send(guild.bgs_time);
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
                                message.channel.send("You don't have a bgs role set up");
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
            'bgsroles(aliases: brl)',
            'Adds, removes or lists the roles set up for using the general commands of BGSBot',
            'bgsroles <add|remove|list> <role id>\nbgsroles <a|r|l> <role id>',
            [
                '`@BGSBot bgsroles set 123456789012345678`',
                '`@BGSBot brl a 123456789012345678`',
                '`@BGSBot bgsroles remove`',
                '`@BGSBot brl remove`',
                '`@BGSBot bgsroles list`',
                '`@BGSBot bgsroles l`'
            ]
        ];
    }
}
