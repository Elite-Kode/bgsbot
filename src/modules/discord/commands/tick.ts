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
import * as moment from 'moment';
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db/index';
import { Access } from './../access';
import { TickV4 } from "../../../interfaces/typings";
import { OptionsWithUrl } from 'request';

export class Tick {
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
                if (argsArray.length === 1) {
                    let requestOptions: OptionsWithUrl = {
                        url: "https://elitebgs.kodeblox.com/api/ebgs/v4/ticks",
                        method: "GET",
                        json: true
                    }

                    request(requestOptions, (error, response, body: TickV4) => {
                        if (!error && response.statusCode == 200) {
                            if (body.length === 0) {
                                message.channel.send(Responses.getResponse(Responses.FAIL));
                            } else {
                                let lastTick = body[0];
                                let embed = new discord.RichEmbed();
                                embed.setTitle("Tick");
                                embed.setColor([255, 0, 255]);
                                let lastTickFormatted = moment(lastTick.time).utc().format('HH:mm');
                                embed.addField("Last Tick", lastTickFormatted + ' UTC');
                                embed.setTimestamp(new Date());
                                message.channel.send(embed)
                                    .catch(err => {
                                        console.log(err);
                                    });
                            }
                        } else {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log(response.statusMessage);
                            }
                        }
                    })
                } else if (argsArray.length > 1) {
                    message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
                } else {
                    message.channel.send(Responses.getResponse(Responses.NOPARAMS));
                }
            })
    }

    help() {
        return [
            'tick',
            'Gets the last tick',
            'tick get',
            [
                '`@BGSBot tick get`'
            ]
        ];
    }
}
