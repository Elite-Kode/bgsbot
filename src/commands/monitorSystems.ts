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
import axios, { AxiosRequestConfig } from 'axios';
import { Access, ADMIN, Command, FORBIDDEN, GuildModel, IGuildSchema, LoggingClient, Responses } from 'kodeblox';
import { EBGSSystemsMinimal } from '../typings/elitebgs';
import { BgsModel, IBgsSchema } from '../schemas/bgs';
import { BGS } from '../accesses/bgs';

export class MonitorSystems implements Command {
  respondDm = false;
  sendDm = false;
  respondAsDm: boolean;
  calls = ['monitorsystems', 'ms'];
  dmCalls = [];
  arguments = {
    add: this.add.bind(this),
    a: this.add.bind(this),
    addprimary: this.addprimary.bind(this),
    ap: this.addprimary.bind(this),
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

  addprimary(message: Message, argsArray: string[]): Promise<void> {
    return this.add(message, argsArray, true);
  }

  async add(message: Message, argsArray: string[], primary = false): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, BGS, FORBIDDEN], true);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length < 2) {
      message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      return;
    }
    let systemName = argsArray.slice(1).join(' ').toLowerCase();
    const url = 'https://elitebgs.app/api/ebgs/v5/systems';
    const requestOptions: AxiosRequestConfig = {
      params: {
        name: systemName,
        minimal: true
      }
    };

    const response = await axios.get<EBGSSystemsMinimal>(url, requestOptions);
    if (response.status !== 200) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(response.statusText);
      return;
    }
    const body = response.data;
    if (body.total === 0) {
      await message.channel.send(Responses.getResponse(Responses.FAIL));
      message.channel.send('System not found');
      return;
    }
    const responseSystem = body.docs[0];
    systemName = responseSystem.name;
    const systemNameLower = responseSystem.name_lower;
    const monitorSystems = {
      system_name: systemName,
      system_name_lower: systemNameLower,
      primary: primary,
      system_pos: {
        x: responseSystem.x,
        y: responseSystem.y,
        z: responseSystem.z
      }
    };
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
          $addToSet: { monitor_systems: monitorSystems }
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
    const permission = await Access.has(message.author, message.guild, [ADMIN, BGS, FORBIDDEN], true);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length < 2) {
      message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
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
    const systemName = argsArray.slice(1).join(' ').toLowerCase();
    try {
      await BgsModel.findOneAndUpdate(
        { guild_id: guild._id },
        {
          $pull: { monitor_systems: { system_name_lower: systemName } }
        }
      );
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
  }

  async list(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, BGS, FORBIDDEN], true);
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
    if (!bgs || !bgs.monitor_systems || bgs.monitor_systems.length === 0) {
      message.channel.send("You don't have any monitored system set up");
      return;
    }
    const embed = new MessageEmbed();
    embed.setTitle('MONITORED SYSTEMS');
    embed.setColor([255, 0, 255]);
    let systemList = '';
    for (const system of bgs.monitor_systems) {
      systemList += `${system.system_name}`;
      if (system.primary) {
        systemList += ` | PRIMARY`;
      }
      systemList += `\n`;
    }
    embed.addField('Systems', systemList);
    embed.setTimestamp(new Date());
    message.channel.send({ embeds: [embed] });
  }

  help(): [string, string, string, string[]] {
    return [
      'monitorsystems(aliases: ms)',
      'Adds a system to monitor for displaying in the BGS Report. A system can be optionally added as a primary for more detailed results',
      'monitorsystems <add|addprimary|remove|list> <system name>\nmonitorsystems <a|ap|r|l> <system name>',
      [
        "`@BGSBot monitorsystems add qa'wakana`",
        "`@BGSBot ms a qa'wakana`",
        "`@BGSBot monitorsystems addprimary qa'wakana`",
        "`@BGSBot monitorsystems ap qa'wakana`",
        "`@BGSBot monitorsystems remove qa'wakana`",
        "`@BGSBot mf remove qa'wakana`",
        '`@BGSBot monitorsystems list`'
      ]
    ];
  }
}
