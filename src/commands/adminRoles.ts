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

import { Message, MessageEmbed } from 'discord.js';
import { Access, ADMIN, Command, FORBIDDEN, GuildModel, IGuildSchema, LoggingClient, Responses } from 'kodeblox';

export class AdminRoles implements Command {
  respondDm = false;
  sendDm = false;
  respondAsDm: boolean;
  calls = ['adminroles', 'arl'];
  dmCalls = [];
  arguments = {
    add: this.add.bind(this),
    a: this.add.bind(this),
    remove: this.remove.bind(this),
    r: this.remove.bind(this),
    list: this.list.bind(this),
    l: this.list.bind(this)
  };

  constructor() {
    this.respondAsDm = false;
  }

  exec(message: Message, _commandArguments: string, argsArray: string[]): void {
    if (argsArray.length <= 0) {
      message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      return;
    }
    type ArgumentKeys = keyof typeof this.arguments;
    const allowedArguments = Object.keys(this.arguments) as Array<ArgumentKeys>;
    const command = argsArray[0].toLowerCase() as ArgumentKeys;
    if (!allowedArguments.includes(command)) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_COMMAND));
      return;
    }
    this.arguments[command](message, argsArray);
  }

  async add(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [], true);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length > 2) {
      message.channel.send(Responses.getResponse(Responses.TOO_MANY_PARAMS));
      return;
    }
    if (argsArray.length < 2) {
      message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      return;
    }
    const adminRoleId = argsArray[1];

    if (!message.guild.roles.cache.has(adminRoleId)) {
      message.channel.send(Responses.getResponse(Responses.ID_NOT_FOUND));
      return;
    }
    let guild: IGuildSchema | null;
    try {
      guild = await GuildModel.findOneAndUpdate(
        { guild_id: message.guildId },
        {
          $addToSet: { admin_roles_id: adminRoleId }
        }
      );
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (!guild) {
      message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
      return;
    }
    message.channel.send(Responses.getResponse(Responses.SUCCESS));
  }

  async remove(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, FORBIDDEN], true);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length > 2) {
      message.channel.send(Responses.getResponse(Responses.TOO_MANY_PARAMS));
      return;
    }
    if (argsArray.length < 2) {
      message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      return;
    }
    const adminRoleId = argsArray[1];

    let guild: IGuildSchema | null;
    try {
      guild = await GuildModel.findOneAndUpdate(
        { guild_id: message.guildId },
        {
          $pull: { admin_roles_id: adminRoleId }
        }
      );
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (!guild) {
      message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
      return;
    }
    message.channel.send(Responses.getResponse(Responses.SUCCESS));
  }

  async list(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, FORBIDDEN], true);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length > 1) {
      message.channel.send(Responses.getResponse(Responses.TOO_MANY_PARAMS));
      return;
    }
    let guild: IGuildSchema | null;
    try {
      guild = await GuildModel.findOne({ guild_id: message.guildId });
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (!guild) {
      message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
      return;
    }
    if (!guild.admin_roles_id || guild.admin_roles_id.length === 0) {
      message.channel.send("You don't have any admin roles set up");
      return;
    }
    const embed = new MessageEmbed();
    embed.setTitle('Admin Roles');
    embed.setColor([255, 0, 255]);
    let idList = '';
    for (const id of guild.admin_roles_id) {
      idList += message.guild.roles.cache.has(id)
        ? `${id} - @${message.guild.roles.cache.get(id)?.name}\n`
        : `${id} - Does not exist in Discord. Please delete this from BGSBot`;
    }
    embed.addField('Ids and Names', idList);
    embed.setTimestamp(new Date());
    message.channel.send({ embeds: [embed] });
  }

  help(): [string, string, string, string[]] {
    return [
      'adminroles(aliases: arl)',
      'Adds, removes or lists the roles that should have administering capability over BGSBot',
      'adminroles <add|remove|list> <role id>\nadminroles <a|r|l> <role id>',
      [
        '`@BGSBot adminroles add 1234564789012345678`',
        '`@BGSBot arl a 1234564789012345678`',
        '`@BGSBot adminroles remove 123456789012345678`',
        '`@BGSBot arl remove 123456789012345678`',
        '`@BGSBot adminroles list`',
        '`@BGSBot adminroles l`'
      ]
    ];
  }
}
