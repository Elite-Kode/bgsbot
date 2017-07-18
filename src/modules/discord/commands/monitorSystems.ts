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
import * as request from 'request';
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db/index';
import { Access } from './../access';

export class MonitorSystems {
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

    add(message: discord.Message, argsArray: string[], primary: boolean = false) {
        Access.has(message.member, [Access.ADMIN, Access.BGS, Access.FORBIDDEN])
            .then(() => {
                if (argsArray.length >= 2) {
                    let guildId = message.guild.id;
                    let systemName = argsArray.slice(1).join(" ");
                    let requestOptions = {
                        url: "http://elitebgs.kodeblox.com/api/eddb/v1/populatedsystems",
                        method: "GET",
                        auth: {
                            'user': 'guest',
                            'pass': 'secret',
                            'sendImmediately': true
                        },
                        qs: { name: systemName }
                    }

                    request(requestOptions, (error, response, body) => {
                        if (!error && response.statusCode == 200) {
                            let responseData: string = body;
                            if (responseData.length === 2) {
                                message.channel.send(Responses.getResponse(Responses.FAIL))
                                    .then(() => {
                                        message.channel.send("System not found");
                                    })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            } else {
                                let responseObject: object = JSON.parse(responseData);
                                let systemName = responseObject[0].name;
                                let systemNameLower = responseObject[0].name_lower;
                                let monitorSystems = {
                                    system_name: systemName,
                                    system_name_lower: systemNameLower,
                                    primary: primary,
                                    system_pos: {
                                        x: responseObject[0].x,
                                        y: responseObject[0].y,
                                        z: responseObject[0].z
                                    }
                                }
                                this.db.model.guild.findOneAndUpdate(
                                    { guild_id: guildId },
                                    {
                                        updated_at: new Date(),
                                        $addToSet: { monitor_systems: monitorSystems }
                                    })
                                    .then(guild => {
                                        if (guild) {
                                            message.channel.send(Responses.getResponse(Responses.SUCCESS));
                                        } else {
                                            message.channel.send(Responses.getResponse(Responses.FAIL))
                                                .then(() => {
                                                    message.channel.send("Your guild is not set yet");
                                                })
                                                .catch(err => {
                                                    console.log(err);
                                                });
                                        }
                                    })
                                    .catch(err => {
                                        message.channel.send(Responses.getResponse(Responses.FAIL));
                                        console.log(err);
                                    })
                            }
                        }
                    });
                } else {
                    message.channel.send(Responses.getResponse(Responses.NOPARAMS));
                }
            })
            .catch(() => {
                message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
            })
    }

    addprimary(message: discord.Message, argsArray: string[]) {
        this.add(message, argsArray, true);
    }

    remove(message: discord.Message, argsArray: string[]) {
        Access.has(message.member, [Access.ADMIN, Access.BGS, Access.FORBIDDEN])
            .then(() => {
                if (argsArray.length >= 2) {
                    let guildId = message.guild.id;
                    let systemName = argsArray.slice(1).join(" ").toLowerCase();

                    this.db.model.guild.findOneAndUpdate(
                        { guild_id: guildId },
                        {
                            updated_at: new Date(),
                            $pull: { monitor_systems: { system_name_lower: systemName } }
                        })
                        .then(guild => {
                            if (guild) {
                                message.channel.send(Responses.getResponse(Responses.SUCCESS));
                            } else {
                                message.channel.send(Responses.getResponse(Responses.FAIL))
                                    .then(() => {
                                        message.channel.send("Your guild is not set yet");
                                    })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            }
                        })
                        .catch(err => {
                            message.channel.send(Responses.getResponse(Responses.FAIL));
                            console.log(err);
                        })
                } else {
                    message.channel.send(Responses.getResponse(Responses.NOPARAMS));
                }
            })
            .catch(() => {
                message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
            })
    }

    list(message: discord.Message, argsArray: string[]) {
        Access.has(message.member, [Access.ADMIN, Access.BGS, Access.FORBIDDEN])
            .then(() => {
                if (argsArray.length === 1) {
                    let guildId = message.guild.id;

                    this.db.model.guild.findOne({ guild_id: guildId })
                        .then(guild => {
                            if (guild) {
                                let embed = new discord.RichEmbed();
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
                                message.channel.send({ embed })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            } else {
                                message.channel.send(Responses.getResponse(Responses.FAIL))
                                    .then(() => {
                                        message.channel.send("Your guild is not set yet");
                                    })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            }
                        })
                        .catch(err => {
                            message.channel.send(Responses.getResponse(Responses.FAIL));
                            console.log(err);
                        })
                } else if (argsArray.length > 1) {
                    message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
                } else {
                    message.channel.send(Responses.getResponse(Responses.NOPARAMS));
                }
            })
            .catch(() => {
                message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
            })
    }
}
