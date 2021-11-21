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
import { BgsModel, IBgsSchema } from '../schemas/bgs';

export class Sort implements Command {
  respondDm = false;
  sendDm = false;
  respondAsDm: boolean;
  calls = ['sort'];
  dmCalls = [];
  arguments = {
    set: this.set.bind(this),
    s: this.set.bind(this),
    remove: this.remove.bind(this),
    r: this.remove.bind(this),
    show: this.show.bind(this),
    sh: this.show.bind(this)
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

  async set(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, FORBIDDEN]);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length > 3) {
      message.channel.send(Responses.getResponse(Responses.TOO_MANY_PARAMS));
      return;
    }
    if (argsArray.length < 3) {
      message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      return;
    }
    const sortType = argsArray[1].toLowerCase();
    const sortOrder = argsArray[2].toLowerCase();
    if (
      (sortType !== 'name' && sortType !== 'influence') ||
      (sortOrder !== 'increasing' && sortOrder !== 'decreasing' && sortOrder !== 'disable')
    ) {
      await message.channel.send('Sort Order and/or Type is incorrect.');
      return;
    }
    let sortOrderNumber = 0;
    if (sortOrder === 'increasing') {
      sortOrderNumber = 1;
    }
    if (sortOrder === 'decreasing') {
      sortOrderNumber = -1;
    }
    if (sortOrder === 'disable') {
      sortOrderNumber = 0;
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
    try {
      await BgsModel.findOneAndUpdate(
        { guild_id: guild._id },
        {
          sort: sortType,
          sort_order: sortOrderNumber
        }
      );
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    message.channel.send(Responses.getResponse(Responses.SUCCESS));
  }

  async remove(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, FORBIDDEN]);
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
    try {
      await BgsModel.findOneAndUpdate(
        { guild_id: guild._id },
        {
          $unset: {
            sort: 1,
            sort_order: 1
          }
        }
      );
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    message.channel.send(Responses.getResponse(Responses.SUCCESS));
  }

  async show(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, FORBIDDEN]);
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
    let bgs: IBgsSchema | null;
    try {
      bgs = await BgsModel.findOne({ guild_id: guild._id });
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (!bgs || !bgs.sort || bgs.sort.length === 0 || !bgs.sort_order) {
      message.channel.send("You don't have sorting set up");
      return;
    }
    const embed = new MessageEmbed();
    embed.setTitle('Sorting');
    embed.setColor([255, 0, 255]);
    let sortOrder = 'Disabled';
    if (bgs.sort_order > 0) {
      sortOrder = 'Increasing';
    }
    if (bgs.sort_order < 0) {
      sortOrder = 'Decreasing';
    }
    embed.addField('Sort Type: ', bgs.sort);
    embed.addField('Sort Order: ', sortOrder);
    embed.setTimestamp(new Date());
    message.channel.send({ embeds: [embed] });
  }

  help(): [string, string, string, string[]] {
    return [
      'sort',
      'Sets, removes or shows your sorting settings. This helps in sorting your reports in a predefined order. Use disable to temporarily disable sorting',
      'sort <set|remove|show> <name|influence> <increasing|decreasing|disable>',
      [
        '`@BGSBot sort set name increasing`',
        '`@BGSBot sort set influence decreasing`',
        '`@BGSBot sort set influence disable`',
        '`@BGSBot sort remove`',
        '`@BGSBot sort show`'
      ]
    ];
  }
}
