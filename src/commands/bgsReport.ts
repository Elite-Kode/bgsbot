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
import { Access, ADMIN, Command, FORBIDDEN, LoggingClient, Responses } from 'kodeblox';
import { BGS } from '../utilities';
import { BgsModel, IBgsSchema } from '../schemas/bgs';
import { Schema } from 'mongoose';
import { generateBgsReport } from '../bgsReport';
import { Scheduler } from 'kodeblox';

export class BgsReport implements Command {
  respondDm = false;
  sendDm = true;
  respondAsDm: boolean;
  calls = ['bgsreport', 'brt'];
  dmCalls = ['bgsreportdm', 'brtdm'];
  arguments = {
    get: this.get.bind(this),
    g: this.get.bind(this),
    settime: this.settime.bind(this),
    st: this.settime.bind(this),
    showtime: this.showtime.bind(this),
    sh: this.showtime.bind(this),
    unsettime: this.unsettime.bind(this),
    u: this.unsettime.bind(this)
  };
  scheduler: Scheduler;

  constructor(respondAsDm: boolean, scheduler: Scheduler) {
    this.respondAsDm = respondAsDm;
    this.scheduler = scheduler;
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
    const permission = await Access.has(message.author, message.guild, [ADMIN, BGS, FORBIDDEN]);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length > 1) {
      message.channel.send(Responses.getResponse(Responses.TOO_MANY_PARAMS));
      return;
    }
    const guildId = message.guildId;
    if (!guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const embedArray = await generateBgsReport(guildId); // Todo: Handle error
    if (this.respondAsDm) {
      await message.channel.send("I have DM'd the result to you");
    }
    for (let index = 0; index < embedArray.length; index++) {
      if (this.respondAsDm) {
        await message.author.send({ embeds: embedArray.slice(index, index + 1) });
        continue;
      }
      await message.channel.send({ embeds: embedArray.slice(index, index + 1) });
    }
  }

  async settime(message: Message, argsArray: string[]): Promise<void> {
    const permission = await Access.has(message.author, message.guild, [ADMIN, BGS, FORBIDDEN]);
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
    const guildId = message.guildId;
    if (!guildId || !message.guild) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const time = argsArray[1].split(':').map((element) => {
      return parseInt(element);
    });
    if (
      time.length !== 3 ||
      time[0] < 0 ||
      time[0] >= 24 ||
      time[1] < 0 ||
      time[1] >= 59 ||
      time[2] < 0 ||
      time[2] >= 59
    ) {
      message.channel.send('Time must be of the form HH:mm:ss');
      return;
    }
    let bgs: IBgsSchema | null;
    try {
      bgs = await BgsModel.findOne({ guild_id: new Schema.Types.ObjectId(guildId) });
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (!bgs) {
      message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
      return;
    }
    message.channel.send(Responses.getResponse(Responses.SUCCESS));
    const cronPattern = `${time[2]} ${time[1]} ${time[0]} * * *`;
    await this.scheduler.createJob(cronPattern, 'bgs-report', { guildId, channel: bgs.bgs_channel_id });
  }

  async showtime(message: Message, argsArray: string[]): Promise<void> {
    const permission = await Access.has(message.author, message.guild, [ADMIN, BGS, FORBIDDEN]);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length > 1) {
      message.channel.send(Responses.getResponse(Responses.TOO_MANY_PARAMS));
      return;
    }
    const guildId = message.guildId;

    if (!message.guild || !guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    let bgs: IBgsSchema | null;
    try {
      bgs = await BgsModel.findOne({ guild_id: new Schema.Types.ObjectId(guildId) });
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (!bgs) {
      message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
      return;
    }
    if (!bgs.bgs_time || bgs.bgs_time.length === 0) {
      message.channel.send("You don't have a bgs reporting time set up");
      return;
    }
    const embed = new MessageEmbed();
    embed.setTitle('BGS Reporting Time');
    embed.setColor([255, 0, 255]);
    embed.addField('Ids and Names', `${bgs.bgs_time} UTC`);
    embed.setTimestamp(new Date());
    message.channel.send({ embeds: [embed] });
  }

  async unsettime(message: Message, argsArray: string[]): Promise<void> {
    const permission = await Access.has(message.author, message.guild, [ADMIN, BGS, FORBIDDEN]);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length > 1) {
      message.channel.send(Responses.getResponse(Responses.TOO_MANY_PARAMS));
      return;
    }
    const guildId = message.guildId;

    if (!guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    let bgs: IBgsSchema | null;
    try {
      bgs = await BgsModel.findOneAndUpdate(
        { guild_id: new Schema.Types.ObjectId(guildId) },
        {
          $unset: { bgs_time: 1 }
        }
      );
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (!bgs) {
      message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
      return;
    }
    message.channel.send(Responses.getResponse(Responses.SUCCESS));
  }

  help(): [string, string, string, string[]] {
    return [
      'bgsreport(aliases: brt), bgsreportdm(aliases: brtdm',
      'Gets the BGS Report or sets, unsets, shows the time when the BGS Report will be automatically generated',
      'bgsreport <get|settime|showtime|unsettime> <time in UTC>\nbgsreport <g|st|sh|u> <time in UTC>',
      [
        '`@BGSBot bgsreport get`',
        '`@BGSBot brt g`',
        '`@BGSBot brtdm g`',
        '`@BGSBot bgsreportdm g`',
        '`@BGSBot bgsreport settime 15:25:36`',
        '`@BGSBot bgsreport st 15:25:36`',
        '`@BGSBot bgsreport showtime`',
        '`@BGSBot brt showtime`',
        '`@BGSBot bgsreport unsettime`'
      ]
    ];
  }
}
