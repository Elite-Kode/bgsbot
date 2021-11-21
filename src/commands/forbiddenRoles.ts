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

export class ForbiddenRoles implements Command {
  respondDm = false;
  sendDm = false;
  respondAsDm: boolean;
  calls = ['forbiddenroles', 'frl'];
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
    const forbiddenRoleId = argsArray[1];

    if (!message.guild.roles.cache.has(forbiddenRoleId)) {
      message.channel.send(Responses.getResponse(Responses.ID_NOT_FOUND));
      return;
    }
    let guild: IGuildSchema | null;
    try {
      guild = await GuildModel.findOneAndUpdate(
        { guild_id: message.guildId },
        {
          $addToSet: { forbidden_roles_id: forbiddenRoleId }
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
    const forbiddenRoleId = argsArray[1];

    let guild: IGuildSchema | null;
    try {
      guild = await GuildModel.findOneAndUpdate(
        { guild_id: message.guildId },
        {
          $pull: { forbidden_roles_id: forbiddenRoleId }
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
    if (!guild.forbidden_roles_id || guild.forbidden_roles_id.length === 0) {
      message.channel.send("You don't have any forbidden roles set up");
      return;
    }
    const embed = new MessageEmbed();
    embed.setTitle('Forbidden Roles');
    embed.setColor([255, 0, 255]);
    let idList = '';
    for (const id of guild.forbidden_roles_id) {
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
      'forbiddenroles(aliases: frl)',
      'Adds, removes or lists the roles that should be forbidden from accessing BGSBot',
      'forbiddenroles <add|remove|list> <role id>\nforbiddenroles <a|r|l> <role id>',
      [
        '`@BGSBot forbiddenroles add 1234564789012345678`',
        '`@BGSBot frl a 1234564789012345678`',
        '`@BGSBot forbiddenroles remove 123456789012345678`',
        '`@BGSBot forbiddenroles r 123456789012345678`',
        '`@BGSBot forbiddenroles list`',
        '`@BGSBot frl list`'
      ]
    ];
  }
}
