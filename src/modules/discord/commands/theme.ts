/*
 * KodeBlox Copyright 2018 Sayak Mukhopadhyay
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

export class Theme {
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

    async set(message: discord.Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.FORBIDDEN]);
            if (argsArray.length === 2) {
                let guildId = message.guild.id;
                let theme = argsArray[1].toLowerCase();

                if ((theme === 'light' || theme === 'dark')) {
                    try {
                        let guild = await this.db.model.guild.findOneAndUpdate(
                            { guild_id: guildId },
                            {
                                updated_at: new Date(),
                                theme: theme
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
                    try {
                        await message.channel.send(Responses.getResponse(Responses.FAIL));
                        message.channel.send("Theme name is incorrect.");
                    } catch (err) {
                        App.bugsnagClient.client.notify(err);
                        console.log(err);
                    }
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
                        { guild_id: guildId },
                        {
                            updated_at: new Date(),
                            $unset: {
                                theme: 1
                            }
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
                    let guild = await this.db.model.guild.findOne({ guild_id: guildId });
                    if (guild) {
                        if (guild.theme) {
                            let embed = new discord.RichEmbed();
                            embed.setTitle("Theme");
                            embed.setColor([255, 0, 255]);
                            embed.addField("Theme: ", guild.theme);
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
                                message.channel.send("You don't have sorting set up");;
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
            'theme',
            'Sets, removes or shows your current theme. Used in charts and other areas. Defaults to light',
            'theme <set|remove|show> <light|dark>',
            [
                '`@BGSBot theme set dark`',
                '`@BGSBot theme set light`',
                '`@BGSBot theme remove`',
                '`@BGSBot theme show`'
            ]
        ];
    }
}
