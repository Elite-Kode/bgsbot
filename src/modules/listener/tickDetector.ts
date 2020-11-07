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

import { io } from 'socket.io-client';
import * as moment from 'moment';
import App from '../../server';
import { IGuildModel } from '../../db/models';
import { Client, GuildChannel, RichEmbed, TextChannel } from 'discord.js';
import { Socket } from 'socket.io-client/build/socket';

export class TickDetector {
    private static socket: Socket;
    private static guilds: IGuildModel[];

    public static initiateSocket(guilds: IGuildModel[], client: Client) {
        this.socket = io('http://tick.phelbore.com:31173');
        this.guilds = guilds;

        this.socket.on('connect', () => {
            console.log('Connected to Tick Detector');
        });

        this.socket.on('tick', (data) => {
            let tickTime = new Date(data);
            for (let guild of this.guilds) {
                try {
                    if (guild.announce_tick && guild.bgs_channel_id && guild.bgs_channel_id.length > 0) {
                        let bgsChannel: GuildChannel = client.guilds.get(guild.guild_id).channels.get(guild.bgs_channel_id);
                        if (bgsChannel && bgsChannel.type === 'text') {
                            let embed = new RichEmbed();
                            embed.setTitle("Tick Detected");
                            embed.setColor([255, 0, 255]);
                            let lastTickFormattedTime = moment(tickTime).utc().format('HH:mm');
                            let lastTickFormattedDate = moment(tickTime).utc().format('Do MMM');
                            embed.addField("Latest Tick At", lastTickFormattedTime + ' UTC - ' + lastTickFormattedDate);
                            embed.setTimestamp(new Date(tickTime));
                            (bgsChannel as TextChannel).send(embed);
                        }
                    }
                } catch (err) {
                    App.bugsnagClient.call(err, {
                        metaData: {
                            guild: guild._id
                        }
                    });
                }
                ;
            }
        });
    }

    public static addGuildToSocket(guild: IGuildModel) {
        if (this.guilds.findIndex(element => {
            return element.guild_id === guild.guild_id;
        }) === -1) {
            this.guilds.push(guild)
        }
    }

    public static removeGuildFromSocket(guild: IGuildModel) {
        let index = this.guilds.findIndex(element => {
            return element.guild_id === guild.guild_id;
        });
        if (index !== -1) {
            this.guilds.splice(index)
        }
    }
}
