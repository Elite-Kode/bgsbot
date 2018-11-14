/*
 * KodeBlox Copyright 2018 Sayak Mukhopadhyay
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http: //www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as io from 'socket.io-client';
import * as moment from 'moment';
import { IGuildModel } from '../../db/models/index';
import { Client, GuildChannel, TextChannel, RichEmbed } from 'discord.js';
import { Socket } from 'socket.io';

export class TickDetector {
    private static socket: Socket;

    public static initiateSocket(guilds: IGuildModel[], client: Client) {
        this.socket = io('http://tick.phelbore.com:31173');

        this.socket.on('connect', () => {
            console.log('Connected to Tick Detector');
        });

        this.socket.on('tick', (data) => {
            let tickTime = new Date(data);
            guilds.forEach(guild => {
                if (guild.announce_tick && guild.bgs_channel_id && guild.bgs_channel_id.length > 0) {
                    let bgsChannel: GuildChannel = client.guilds.get(guild.guild_id).channels.get(guild.bgs_channel_id);
                    if (bgsChannel && bgsChannel.type === 'text') {
                        let embed = new RichEmbed();
                        embed.setTitle("Tick Detected");
                        embed.setColor([255, 0, 255]);
                        let lastTickFormatted = moment(tickTime).utc().format('HH:mm');
                        embed.addField("Latest Tick At", lastTickFormatted + ' UTC');
                        embed.setTimestamp(new Date());
                        (bgsChannel as TextChannel).send(embed)
                            .catch(err => {
                                console.log(err);
                            });
                    }
                }
            })
        });
    }
}
