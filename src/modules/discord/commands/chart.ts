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

import { Message, MessageAttachment, Permissions } from 'discord.js';
import * as request from 'request-promise-native';
import { FullResponse, OptionsWithUrl } from 'request-promise-native';
import * as contentDisposition from 'content-disposition';
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db';
import { Access } from '../access';

export class Chart {
    db: DB;
    dm: boolean;

    constructor(dm = false) {
        this.db = App.db;
        this.dm = dm;
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

    async get(message: Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.BGS, Access.FORBIDDEN]);
            if (argsArray.length >= 4 || (argsArray.length === 2 && argsArray[1] === 'tick')) {
                let url: string;
                let name: string;
                if (argsArray[1] === 'tick') {
                    url = `https://elitebgs.app/chartgenerator/${argsArray[1]}`;
                    name = null;
                } else {
                    url = `https://elitebgs.app/chartgenerator/${argsArray[1]}/${argsArray[2]}`;
                    name = argsArray.slice(3).join(" ").toLowerCase();
                }
                let timenow = Date.now();

                try {
                    let guild = await this.db.model.guild.findOne({guild_id: message.guild.id});
                    if (guild) {
                        let flags = Permissions.FLAGS;
                        if (message.guild.me.permissionsIn(message.channel).has([flags.EMBED_LINKS, flags.ATTACH_FILES])) {
                            let theme = 'light';
                            if (guild.theme) {
                                theme = guild.theme;
                            }
                            let requestOptions: OptionsWithUrl = {
                                url: url,
                                qs: {
                                    name: name,
                                    timemin: timenow - 10 * 24 * 60 * 60 * 1000,
                                    timemax: timenow,
                                    theme: theme
                                },
                                encoding: null,
                                resolveWithFullResponse: true
                            }

                            let response: FullResponse = await request.get(requestOptions);
                            if (response.statusCode === 200) {
                                let attachment = new MessageAttachment(response.body as Buffer, contentDisposition.parse(response.headers['content-disposition']).parameters.filename);
                                if (this.dm) {
                                    message.channel.send("I have DM'd the result to you");
                                    message.member.send(attachment);
                                } else {
                                    message.channel.send(attachment);
                                }
                            } else {
                                App.bugsnagClient.call(response.statusMessage, {
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

    help() {
        return [
            'chart',
            'Generates a chart for the last 7 days',
            'chart get <factions|systems|tick> <influence|state|pending|recovering> <system name|faction name>',
            [
                '`@BGSBot chart get systems influence qa\'wakana`',
                '`@BGSBot chart get factions state knights of karma`',
                '`@BGSBot chart get factions pending knights of karma`',
                '`@BGSBot chart get factions recovering knights of karma`',
                '`@BGSBot chart get tick`'
            ]
        ];
    }
}
