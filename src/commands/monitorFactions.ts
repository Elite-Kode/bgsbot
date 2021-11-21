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
import { EBGSFactionsMinimal } from '../typings/elitebgs';
import { BgsModel, IBgsSchema } from '../schemas/bgs';
import { BGS } from '../accesses/bgs';

export class MonitorFactions implements Command {
  respondDm = false;
  sendDm = false;
  respondAsDm: boolean;
  calls = ['monitorfactions', 'mf'];
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
    let factionName = argsArray.slice(1).join(' ').toLowerCase();
    const url = 'https://elitebgs.app/api/ebgs/v5/factions';
    const requestOptions: AxiosRequestConfig = {
      params: {
        name: factionName,
        minimal: true
      }
    };

    const response = await axios.get<EBGSFactionsMinimal>(url, requestOptions);
    if (response.status !== 200) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(response.statusText);
      return;
    }
    const body = response.data;
    if (body.total === 0) {
      await message.channel.send(Responses.getResponse(Responses.FAIL));
      message.channel.send('Faction not found');
      return;
    }
    const responseFaction = body.docs[0];
    factionName = responseFaction.name;
    const factionNameLower = responseFaction.name_lower;
    const monitorFactions = {
      faction_name: factionName,
      faction_name_lower: factionNameLower,
      primary: primary
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
          $addToSet: { monitor_factions: monitorFactions }
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
    const factionName = argsArray.slice(1).join(' ').toLowerCase();
    try {
      await BgsModel.findOneAndUpdate(
        { guild_id: guild._id },
        {
          $pull: { monitor_factions: { faction_name_lower: factionName } }
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
    if (!bgs || !bgs.monitor_factions || bgs.monitor_factions.length === 0) {
      message.channel.send("You don't have any monitored faction set up");
      return;
    }
    const embed = new MessageEmbed();
    embed.setTitle('MONITORED FACTIONS');
    embed.setColor([255, 0, 255]);
    let factionList = '';
    for (const faction of bgs.monitor_factions) {
      factionList += `${faction.faction_name}`;
      if (faction.primary) {
        factionList += ` | PRIMARY`;
      }
      factionList += `\n`;
    }
    embed.addField('Factions', factionList);
    embed.setTimestamp(new Date());
    message.channel.send({ embeds: [embed] });
  }

  help(): [string, string, string, string[]] {
    return [
      'monitorfactions(aliases: mf)',
      'Adds a faction to monitor for displaying in the BGS Report. A faction can be optionally added as a primary for more detailed results',
      'monitorfactions <add|addprimary|remove|list> <faction name>\nmonitorfactions <a|ap|r|l> <faction name>',
      [
        '`@BGSBot monitorfactions add knights of karma`',
        '`@BGSBot mf a knights of karma`',
        '`@BGSBot monitorfactions addprimary knights of karma`',
        '`@BGSBot monitorfactions ap knights of karma`',
        '`@BGSBot monitorfactions remove knights of karma`',
        '`@BGSBot mf remove knights of karma`',
        '`@BGSBot monitorfactions list`'
      ]
    ];
  }
}
