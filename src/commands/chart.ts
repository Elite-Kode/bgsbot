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

import { Message, MessageAttachment } from 'discord.js';
import { Access, Command, GuildModel, IGuildSchema, LoggingClient, Responses } from 'kodeblox';
import contentDisposition from 'content-disposition';
import axios, { AxiosRequestConfig } from 'axios';
import { BgsModel, IBgsSchema } from '../schemas/bgs';

export class Chart implements Command {
  respondDm = false;
  sendDm = true;
  respondAsDm: boolean;
  calls = ['chart'];
  dmCalls = ['chartdm'];
  arguments = {
    get: this.get.bind(this),
    g: this.get.bind(this)
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
    const permission = await Access.has(message.author, message.guild, []);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length < 4 && (argsArray.length !== 2 || argsArray[1] !== 'tick')) {
      message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      return;
    }
    let url: string;
    let name: string | null;
    if (argsArray[1] === 'tick') {
      url = `https://elitebgs.app/api/chartgenerator/${argsArray[1]}`;
      name = null;
    } else {
      url = `https://elitebgs.app/api/chartgenerator/${argsArray[1]}/${argsArray[2]}`;
      name = argsArray.slice(3).join(' ').toLowerCase();
    }
    const timeNow = Date.now();
    let guild: IGuildSchema | null;
    try {
      guild = await GuildModel.findOne({ guild_id: message.guild.id });
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
    let theme = 'light';
    if (bgs && bgs.theme) {
      theme = bgs.theme;
    }
    const requestOptions: AxiosRequestConfig = {
      params: {
        name: name,
        timeMin: timeNow - 10 * 24 * 60 * 60 * 1000,
        timeMax: timeNow,
        theme: theme
      },
      responseType: 'arraybuffer'
    };

    const response = await axios.get<Buffer>(url, requestOptions);
    if (response.status !== 200) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(response.statusText);
      return;
    }
    const attachment = new MessageAttachment(
      response.data,
      contentDisposition.parse(response.headers['content-disposition']).parameters.filename
    );
    if (this.respondAsDm) {
      await message.channel.send("I have DM'd the result to you");
      message.author.send({ attachments: [attachment] });
      return;
    }
    message.channel.send({ attachments: [attachment] });
  }

  help(): [string, string, string, string[]] {
    return [
      'chart, chartdm',
      'Generates a chart for the last 7 days',
      'chart get <factions|systems|tick> <influence|state|pending|recovering> <system name|faction name>',
      [
        "`@BGSBot chart get systems influence qa'wakana`",
        '`@BGSBot chart get factions state knights of karma`',
        '`@BGSBot chart get factions pending knights of karma`',
        '`@BGSBot chart get factions recovering knights of karma`',
        '`@BGSBot chartdm get factions recovering knights of karma`',
        '`@BGSBot chart get tick`'
      ]
    ];
  }
}
