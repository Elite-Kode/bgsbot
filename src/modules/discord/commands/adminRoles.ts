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

export class AdminRoles {
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

    add(message: discord.Message, argsArray: string[]) {
        // Only the server admins can set the admin roles
        if (message.member.hasPermission("ADMINISTRATOR")) {
            if (argsArray.length === 2) {
                let guildId = message.guild.id;
                let adminRoleId = argsArray[1];

                this.db.model.guild.findOneAndUpdate(
                    { guild_id: guildId },
                    { $addToSet: { admin_roles_id: adminRoleId } })
                    .then(guild => {
                        message.channel.send(Responses.getResponse(Responses.SUCCESS));
                    })
                    .catch(err => {
                        message.channel.send(Responses.getResponse(Responses.FAIL));
                        console.log(err);
                    })
            } else if (argsArray.length > 2) {
                message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
            } else {
                message.channel.send(Responses.getResponse(Responses.NOPARAMS));
            }
        } else {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    remove(message: discord.Message, argsArray: string[]) {
        Access.has(message.member, [Access.ADMIN, Access.FORBIDDEN])
            .then(() => {
                if (argsArray.length === 2) {
                    let guildId = message.guild.id;
                    let adminRoleId = argsArray[1];

                    this.db.model.guild.findOneAndUpdate(
                        { guild_id: guildId },
                        { $pull: { admin_roles_id: adminRoleId } })
                        .then(guild => {
                            message.channel.send(Responses.getResponse(Responses.SUCCESS));
                        })
                        .catch(err => {
                            message.channel.send(Responses.getResponse(Responses.FAIL));
                            console.log(err);
                        })
                } else if (argsArray.length > 2) {
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
