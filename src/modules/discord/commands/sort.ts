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

import { Message, MessageEmbed } from 'discord.js';
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db';
import { Access } from '../access';
import { Command } from "../../../interfaces/Command";

export class Sort implements Command {
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
            if (this[command]) {
                this[command](message, argsArray);
            } else {
                message.channel.send(Responses.getResponse(Responses.NOTACOMMAND));
            }
        } else {
            message.channel.send(Responses.getResponse(Responses.NOPARAMS));
        }
    }

    async set(message: Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.FORBIDDEN]);
            if (argsArray.length === 3) {
                let guildId = message.guild.id;
                let sortType = argsArray[1].toLowerCase();
                let sortOrder = argsArray[2].toLowerCase();

                if ((sortType === 'name' || sortType === 'influence') && (sortOrder === 'increasing' || sortOrder === 'decreasing' || sortOrder === 'disable')) {
                    let sortOrderNumber = 0;
                    if (sortOrder === 'increasing') {
                        sortOrderNumber = 1;
                    }
                    if (sortOrder === 'decreasing') {
                        sortOrderNumber = -1;
                    }
                    if (sortOrder === 'disable') {
                        sortOrderNumber = 0;
                    }

                    try {
                        let guild = await this.db.model.guild.findOneAndUpdate(
                            {guild_id: guildId},
                            {
                                updated_at: new Date(),
                                sort: sortType,
                                sort_order: sortOrderNumber
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
                    try {
                        await message.channel.send(Responses.getResponse(Responses.FAIL));
                        message.channel.send("Sort Order and/or Type is incorrect.");
                    } catch (err) {
                        App.bugsnagClient.call(err);
                    }
                }
            } else if (argsArray.length > 3) {
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

                try {
                    let guild = await this.db.model.guild.findOneAndUpdate(
                        {guild_id: guildId},
                        {
                            updated_at: new Date(),
                            $unset: {
                                sort: 1,
                                sort_order: 1
                            }
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
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.FORBIDDEN]);
            if (argsArray.length === 1) {
                let guildId = message.guild.id;

                try {
                    let guild = await this.db.model.guild.findOne({guild_id: guildId});
                    if (guild) {
                        if (guild.sort && guild.sort.length !== 0 && guild.sort_order) {
                            let embed = new MessageEmbed();
                            embed.setTitle("Sorting");
                            embed.setColor([255, 0, 255]);
                            let sortOrder = 'Disabled';
                            if (guild.sort_order > 0) {
                                sortOrder = 'Increasing';
                            }
                            if (guild.sort_order < 0) {
                                sortOrder = 'Decreasing';
                            }
                            embed.addField("Sort Type: ", guild.sort);
                            embed.addField("Sort Order: ", sortOrder);
                            embed.setTimestamp(new Date());
                            try {
                                message.channel.send(embed)
                            } catch (err) {
                                App.bugsnagClient.call(err, {
                                    metaData: {
                                        guild: guild._id
                                    }
                                });
                            }
                        } else {
                            try {
                                await message.channel.send(Responses.getResponse(Responses.FAIL));
                                message.channel.send("You don't have sorting set up");
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
            'sort',
            'Sets, removes or shows your sorting settings. This helps in sorting your reports in a predefined order. Use disable to temporarily disable sorting',
            'sort <set|remove|show> <name|influence> <increasing|decreasing|disable>',
            [
                '`@BGSBot sort set name increasing`',
                '`@BGSBot sort set influence decreasing`',
                '`@BGSBot sort set influence disable`',
                '`@BGSBot sort remove`',
                '`@BGSBot sort show`'
            ]
        ];
    }
}
