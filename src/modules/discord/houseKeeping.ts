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
import { DB } from '../../db/index';

export class HouseKeeping {
    db: DB
    constructor() {
        this.db = App.db;
    }

    async deletedChannel(channel: discord.Channel) {
        if (channel.type === 'text') {
            let guildId = (channel as discord.TextChannel).guild.id;

            try {
                let guild = await this.db.model.guild.findOneAndUpdate(
                    {
                        guild_id: guildId,
                        bgs_channel_id: channel.id
                    },
                    {
                        updated_at: new Date(),
                        $unset: { bgs_channel_id: 1 }
                    });
                if (guild) {
                    console.log("Channel deleted");
                }
            } catch (err) {
                App.bugsnagClient.call(err);
            }
        }
    }

    async deletedRole(role: discord.Role) {
        let guildId = role.guild.id;
        let bgsRole = async () => {
            try {
                let guild = await this.db.model.guild.findOneAndUpdate(
                    {
                        guild_id: guildId,
                        bgs_role_id: role.id
                    },
                    {
                        updated_at: new Date(),
                        $unset: { bgs_role_id: 1 }
                    });
                if (guild) {
                    console.log("Role deleted");
                }
            } catch (err) {
                App.bugsnagClient.call(err);
            }
        }
        let adminRole = async () => {
            try {
                let guild = await this.db.model.guild.findOneAndUpdate(
                    {
                        guild_id: guildId,
                        admin_roles_id: role.id
                    },
                    {
                        updated_at: new Date(),
                        $pull: { admin_roles_id: role.id }
                    })
                if (guild) {
                    console.log("Role deleted");
                }
            } catch (err) {
                App.bugsnagClient.call(err);
            }
        }
        let forbiddenRole = async () => {
            try {
                let guild = await this.db.model.guild.findOneAndUpdate(
                    {
                        guild_id: guildId,
                        forbidden_roles_id: role.id
                    },
                    {
                        updated_at: new Date(),
                        $pull: { forbidden_roles_id: role.id }
                    })
                if (guild) {
                    console.log("Role deleted");
                }
            } catch (err) {
                App.bugsnagClient.call(err);
            }
        }
        await Promise.all([bgsRole, adminRole, forbiddenRole]);
    }
}
