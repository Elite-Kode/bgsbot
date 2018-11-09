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
import * as request from 'request';
import * as contentDisposition from 'content-disposition';
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db/index';
import { Access } from './../access';
import { OptionsWithUrl } from 'request';

export class Chart {
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
                if (argsArray.length >= 4) {
                    let systemName: string = argsArray.slice(3).join(" ").toLowerCase();
                    let timenow = Date.now();

                    this.db.model.guild.findOne({ guild_id: message.guild.id })
                        .then(guild => {
                            if (guild) {
                                let theme = 'light';
                                if (guild.theme) {
                                    theme = guild.theme;
                                }
                                let requestOptions: OptionsWithUrl = {
                                    url: `http://elitebgs.kodeblox.com/chartgenerator/${argsArray[1]}/${argsArray[2]}`,
                                    method: "GET",
                                    qs: {
                                        name: systemName,
                                        timemin: timenow - 10 * 24 * 60 * 60 * 1000,
                                        timemax: timenow,
                                        theme: theme
                                    },
                                    encoding: null
                                }

                                request(requestOptions, (error, response, body: Buffer) => {
                                    if (!error && response.statusCode == 200) {
                                        let attachment = new discord.Attachment(body, contentDisposition.parse(response.headers['content-disposition']).parameters.filename);
                                        message.channel.send(attachment);
                                    } else {
                                        if (error) {
                                            console.log(error);
                                        } else {
                                            console.log(response.statusMessage);
                                        }
                                    }
                                });
                            }
                        })
                        .catch(err => {
                            message.channel.send(Responses.getResponse(Responses.FAIL));
                            console.log(err);
                        });
                }
            })
    }

    help() {
        return [
            'chart',
            'Generates a chart for the last 7 days',
            'chart get <factions|systems> <influence|state|pending|recovering> <system name|faction name>',
            [
                '`@BGSBot chart get systems influence qa\'wakana`',
                '`@BGSBot chart get factions state knights of karma`',
                '`@BGSBot chart get factions pending knights of karma`',
                '`@BGSBot chart get factions recovering knights of karma`'
            ]
        ];
    }
}
