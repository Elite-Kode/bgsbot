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
import { DB } from '../../../db';
import { Access } from '../access';

export class BGSChannel {
    db: DB;

    constructor() {
        this.db = App.db;
    }

    exec(message: discord.Message, commandArguments: string): void {
        let argsArray: string[] = [];
        if (commandArguments.length !== 0) {
            argsArray = commandArguments.split(" ");
        }
        try {
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
        } catch (err) {
            App.bugsnagClient.call(err);
        }
    }

    async set(message: discord.Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.FORBIDDEN]);
            if (argsArray.length === 2) {
                let guildId = message.guild.id;
                let bgsChannelId = argsArray[1];

                if (message.guild.channels.has(bgsChannelId)) {
                    try {
                        let guild = await this.db.model.guild.findOneAndUpdate(
                            {guild_id: guildId},
                            {
                                updated_at: new Date(),
                                bgs_channel_id: bgsChannelId
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

    async remove(message: discord.Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.FORBIDDEN]);
            if (argsArray.length === 1) {
                let guildId = message.guild.id;

                try {
                    let guild = await this.db.model.guild.findOneAndUpdate(
                        {guild_id: guildId},
                        {
                            updated_at: new Date(),
                            $unset: {bgs_channel_id: 1}
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

    async show(message: discord.Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.FORBIDDEN]);
            if (argsArray.length === 1) {
                let guildId = message.guild.id;

                try {
                    let guild = await this.db.model.guild.findOne({guild_id: guildId});
                    if (guild) {
                        if (guild.bgs_channel_id && guild.bgs_channel_id.length !== 0) {
                            let embed = new discord.RichEmbed();
                            embed.setTitle("BGS Channel");
                            embed.setColor([255, 0, 255]);
                            let id = "";
                            if (message.guild.channels.has(guild.bgs_channel_id)) {
                                id = `${guild.bgs_channel_id} - @${message.guild.channels.get(guild.bgs_channel_id).name}\n`;
                            } else {
                                id = `${guild.bgs_channel_id} - Does not exist in Discord. Please delete this from BGSBot`;
                            }
                            embed.addField("Ids and Names", id);
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
                                await message.channel.send(Responses.getResponse(Responses.FAIL));
                                message.channel.send("You don't have a bgs channel set up");
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
            } else if (argsArray.length > 1) {
                message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
            } else {
                message.channel.send(Responses.getResponse(Responses.NOPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    help() {
        return [
            'bgschannel',
            'Sets, removes or shows the channel set up for BGS reporting',
            'bgschannel <set|remove|show> <channel id>',
            [
                '`@BGSBot bgschannel set 1234564789012345678`',
                '`@BGSBot bgschannel remove`',
                '`@BGSBot bgschannel show`'
            ]
        ];
    }
}
