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
import { DB } from '../../../db/index';
import { Access } from './../access';
import * as request from 'request';
import { EBGSFactionsV4WOHistory } from "../../../interfaces/typings";
import { OptionsWithUrl } from 'request';

export class BGSFaction {
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

    set(message: discord.Message, argsArray: string[]) {
        Access.has(message.member, [Access.ADMIN, Access.BGS, Access.FORBIDDEN])
            .then(() => {
                if (argsArray.length >= 2) {
                    let guildId = message.guild.id;
                    let factionName = "";
                    let factionNameLower = argsArray.slice(1).join(" ").toLowerCase();
                    let requestOptions: OptionsWithUrl = {
                        url: "http://elitebgs.kodeblox.com/api/ebgs/v4/factions",
                        method: "GET",
                        qs: { name: factionNameLower },
                        json: true
                    }

                    request(requestOptions, (error, response, body: EBGSFactionsV4WOHistory) => {
                        if (!error && response.statusCode == 200) {
                            if (body.total === 0) {
                                message.channel.send(Responses.getResponse(Responses.FAIL))
                                    .then(() => {
                                        message.channel.send("Faction not found");
                                    })
                                    .catch(err => {
                                        console.log(err);
                                    });
                            } else {
                                let responseFaction = body.docs[0];
                                let factionName = responseFaction.name;
                                let factionNameLower = responseFaction.name_lower;
								this.db.model.guild.findOneAndUpdate(
                                    { guild_id: guildId },
                                    {
                                        updated_at: new Date(),
										bgs_faction_name: factionName,
										bgs_faction_name_lower: factionNameLower
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
                        } else {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log(response.statusMessage);
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


    unset(message: discord.Message, argsArray: string[]) {
        Access.has(message.member, [Access.ADMIN, Access.FORBIDDEN])
            .then(() => {
                if (argsArray.length === 1) {
                    let guildId = message.guild.id;

                    this.db.model.guild.findOneAndUpdate(
                        { guild_id: guildId },
                        {
                            updated_at: new Date(),
                            $unset: { 
								bgs_faction_name: 1,
								bgs_faction_name_lower: 1 
							}
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
                    message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
                }
            })
            .catch(() => {
                message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
            })
    }

    show(message: discord.Message, argsArray: string[]) {
        Access.has(message.member, [Access.ADMIN, Access.FORBIDDEN])
            .then(() => {
                if (argsArray.length === 1) {
                    let guildId = message.guild.id;

                    this.db.model.guild.findOne({ guild_id: guildId })
                        .then(guild => {
                            if (guild) {
                                if (guild.bgs_faction_name) {
                                    let embed = new discord.RichEmbed();
									let bgsFaction = guild.bgs_faction_name;
                                    embed.setTitle("BGS Faction");
                                    embed.setColor([255, 0, 255]);
                                    embed.addField("Faction Name: ", bgsFaction);
                                    embed.setTimestamp(new Date());
                                    message.channel.send(embed)
                                        .catch(err => {
                                            console.log(err);
                                        });
                                } else {
                                    message.channel.send(Responses.getResponse(Responses.FAIL))
                                        .then(() => {
                                            message.channel.send("You don't have a BGS Faction set yet");
                                        })
                                        .catch(err => {
                                            console.log(err);
                                        });
                                }
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

    help() {
        return [
            'bgsfaction',
            'Sets, unsets or shows the faction name set up for flagging influence issues in systems',
            'bgsfaction <set|unset|show> <my faction name>',
            [
                '`@BGSBot bgsfaction set <my faction name> (all lower case)`',
                '`@BGSBot bgsfaction unset`',
                '`@BGSBot bgsfaction show`'
            ]
        ];
    }
}
