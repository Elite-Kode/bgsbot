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

import moment from 'moment';
import { Message, MessageEmbed } from 'discord.js';
import { Access, ADMIN, Command, FORBIDDEN, GuildModel, IGuildSchema, LoggingClient, Responses } from 'kodeblox';
import { BgsModel } from '../schemas/bgs';
import { BGS } from '../accesses/bgs';
import { getTickData } from '../tick';

export class Tick implements Command {
  respondDm = false;
  sendDm = true;
  respondAsDm: boolean;
  calls = ['tick'];
  dmCalls = ['tickdm'];
  arguments = {
    get: this.get.bind(this),
    g: this.get.bind(this),
    detect: this.detect.bind(this),
    stopdetect: this.stopdetect.bind(this)
  };

  constructor(respondAsDm: boolean) {
    this.respondAsDm = respondAsDm;
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

  async get(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, BGS, FORBIDDEN]);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length > 1) {
      message.channel.send(Responses.getResponse(Responses.TOO_MANY_PARAMS));
      return;
    }
    const lastTick = await getTickData();
    const embed = new MessageEmbed();
    embed.setTitle('Tick');
    embed.setColor([255, 0, 255]);
    const lastTickFormattedTime = moment(lastTick.time).utc().format('HH:mm');
    const lastTickFormattedDate = moment(lastTick.time).utc().format('Do MMM');
    embed.addField('Last Tick', lastTickFormattedTime + ' UTC - ' + lastTickFormattedDate);
    embed.setTimestamp(new Date(lastTick.time));
    if (this.respondAsDm) {
      await message.channel.send("I have DM'd the result to you");
      message.author.send({ embeds: [embed] });
    } else {
      message.channel.send({ embeds: [embed] });
    }
  }

  async detect(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, BGS, FORBIDDEN]);
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
          announce_tick: true
        }
      );
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
  }

  async stopdetect(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, BGS, FORBIDDEN]);
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
          announce_tick: false
        }
      );
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
  }

  help(): [string, string, string, string[]] {
    return [
      'tick, tickdm',
      'Gets the last tick or sets and removes the automatic announcement of the tick',
      'tick <get|detect|stopdetect>',
      ['`@BGSBot tick get`', '`@BGSBot tickdm get`', '`@BGSBot tick detect`', '`@BGSBot tick stopdetect`']
    ];
  }
}
