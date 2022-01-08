/*
 * Copyright 2021 Sayak Mukhopadhyay
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { GuildModel, IAccess } from 'kodeblox';
import { Guild, Permissions, User } from 'discord.js';
import { BgsModel } from '../schemas/bgs';

export const BGS = 'bgs';

export class Bgs implements IAccess {
  public priority = 2;

  public async has(
    author: User,
    guild: Guild,
    perms: string[],
    current: boolean,
    allowAdmin = false
  ): Promise<boolean> {
    const member = await guild.members.fetch(author);
    if (allowAdmin && member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
      return true;
    } else {
      const guildId = guild.id;
      const roles = member.roles.cache;
      const dbGuild = await GuildModel.findOne({ guild_id: guildId });
      if (dbGuild) {
        const dbBgs = await BgsModel.findOne({ guild_id: dbGuild._id });
        if (dbBgs) {
          for (const perm of perms) {
            if (perm === BGS) {
              const adminRoles = dbBgs.bgs_roles_id;
              for (const role of adminRoles) {
                if (roles.has(role)) {
                  return true;
                }
              }
            }
          }
        }
      }
    }
    return current;
  }
}
