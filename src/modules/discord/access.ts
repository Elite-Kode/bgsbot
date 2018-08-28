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
import App from '../../server';

export class Access {
    public static readonly ALL: string = "all";
    public static readonly ADMIN: string = "admin";
    public static readonly BGS: string = "bgs";
    public static readonly FORBIDDEN: string = "forbidden";

    public static has(member: discord.GuildMember, perms: string[], allowAdmin = false): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (allowAdmin && member.hasPermission("ADMINISTRATOR")) {
                resolve(true);
            } else {
                let db = App.db;
                let guildId = member.guild.id;
                let roles = member.roles;
                db.model.guild.findOne({ guild_id: guildId })
                    .then(guild => {
                        let bool = false;
                        if (guild) {
                            perms.forEach((permission, index) => {
                                switch (permission) {
                                    case "all": {
                                        bool = true;
                                    }
                                        break;
                                    case "admin": {
                                        let adminRoles = guild.admin_roles_id;
                                        adminRoles.forEach((role, index) => {
                                            if (roles.has(role)) {
                                                bool = true;
                                            }
                                        });
                                    }
                                        break;
                                    case "bgs": {
                                        let bgsRole = guild.bgs_role_id;
                                        if (roles.has(bgsRole)) {
                                            bool = true;
                                        }
                                    }
                                    case "forbidden": {
                                        let forbiddenRoles = guild.forbidden_roles_id;
                                        forbiddenRoles.forEach((role, index) => {
                                            if (roles.has(role)) {
                                                bool = false;
                                            }
                                        });
                                    }
                                }
                            })
                        }

                        if (bool) {
                            resolve(true);
                        } else {
                            reject();
                        }
                    })
            }
        });
    }
}
