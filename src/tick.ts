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
/* eslint-disable @typescript-eslint/ban-ts-comment */

import axios from 'axios';
import { io } from 'socket.io-client';
import { LoggingClient } from 'kodeblox';
import { BaseGuildTextChannel, Client, MessageEmbed } from 'discord.js';
import moment from 'moment';
import { ChannelTypes } from 'discord.js/typings/enums';
import { BgsModel } from './schemas/bgs';
import { TickSchema, TickType } from './typings/elitebgs';
import { BgsWithGuild } from './typings/embed';

export function initiateSocket(client: Client): void {
  // @ts-ignore
  const socket = io(process.env.TICK_SOCKET);

  socket.on('connect', () => {
    console.log('Connected to Tick Detector');
  });

  socket.on('tick', async (data) => {
    const tickTime = new Date(data);
    const guilds: BgsWithGuild[] = await BgsModel.aggregate()
      .option({
        maxTimeMS: 60000
      })
      .match({
        announce_tick: true
      })
      .lookup({
        from: 'guild',
        localField: 'guild_id',
        foreignField: '_id',
        as: 'guild'
      })
      .allowDiskUse(true)
      .exec();
    for (const guild of guilds) {
      try {
        if (guild.announce_tick && guild.bgs_channel_id && guild.bgs_channel_id.length > 0) {
          const discordGuild = client.guilds.cache.get(guild.guild.guild_id);
          if (!discordGuild) {
            LoggingClient.error(`Guild ${guild.guild_id} not found`);
            continue;
          }
          const bgsChannel = discordGuild.channels.cache.get(guild.bgs_channel_id);
          if (
            bgsChannel &&
            bgsChannel.type === ChannelTypes.GUILD_TEXT.toString() &&
            bgsChannel.type !== ChannelTypes.GUILD_NEWS.toString() &&
            bgsChannel instanceof BaseGuildTextChannel
          ) {
            const embed = new MessageEmbed();
            embed.setTitle('Tick Detected');
            embed.setColor([255, 0, 255]);
            const lastTickFormattedTime = moment(tickTime).utc().format('HH:mm');
            const lastTickFormattedDate = moment(tickTime).utc().format('Do MMM');
            embed.addField('Latest Tick At', lastTickFormattedTime + ' UTC - ' + lastTickFormattedDate);
            embed.setTimestamp(new Date(tickTime));
            bgsChannel.send({ embeds: [embed] });
          }
        }
      } catch (err) {
        LoggingClient.error(err);
      }
    }
  });
}

export async function getTickData(): Promise<TickSchema> {
  const url = 'https://elitebgs.app/api/ebgs/v5/ticks';

  const response = await axios.get(url);
  if (response.status == 200) {
    const body: TickType = response.data;
    if (body.length === 0) {
      throw new Error('No tick data received');
    } else {
      return body[0];
    }
  } else {
    throw new Error(response.statusText);
  }
}
