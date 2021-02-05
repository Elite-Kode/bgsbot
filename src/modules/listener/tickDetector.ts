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
import App from '../../server';
import { Client, GuildChannel, MessageEmbed, Permissions, TextChannel } from 'discord.js';
import { Socket } from 'socket.io';
import { Responses } from '../discord/responseDict';
import { DB } from '../../db';

export class TickDetector {
    private static socket: Socket;
    private static db: DB

    public static initiateSocket(client: Client) {
        this.socket = io('http://tick.phelbore.com:31173');
        this.db = App.db;

        this.socket.on('connect', () => {
            console.log('Connected to Tick Detector');
        });

        this.socket.on('tick', async (data) => {
            let tickTime = new Date(data);
            let guilds = await this.db.model.guild.find({
                announce_tick: true
            }).lean();
            for (let guild of guilds) {
                try {
                    if (guild.announce_tick && guild.bgs_channel_id && guild.bgs_channel_id.length > 0) {
                        let bgsChannel: GuildChannel = client.guilds.cache.get(guild.guild_id).channels.cache.get(guild.bgs_channel_id);
                        if (bgsChannel && bgsChannel.type === 'text') {
                            let flags = Permissions.FLAGS;
                            if (bgsChannel.guild.me.permissionsIn(bgsChannel).has([flags.EMBED_LINKS])) {
                                let embed = new MessageEmbed();
                                embed.setTitle("Tick Detected");
                                embed.setColor([255, 0, 255]);
                                let lastTickFormattedTime = moment(tickTime).utc().format('HH:mm');
                                let lastTickFormattedDate = moment(tickTime).utc().format('Do MMM');
                                embed.addField("Latest Tick At", lastTickFormattedTime + ' UTC - ' + lastTickFormattedDate);
                                embed.setTimestamp(new Date(tickTime));
                                (bgsChannel as TextChannel).send(embed);
                            } else {
                                try {
                                    (bgsChannel as TextChannel).send(Responses.getResponse(Responses.EMBEDPERMISSION));
                                } catch (err) {
                                    App.bugsnagClient.call(err, {
                                        metaData: {
                                            guild: guild._id
                                        }
                                    });
                                }
                            }
                        }
                    }
                } catch (err) {
                    App.bugsnagClient.call(err, {
                        metaData: {
                            guild: guild._id
                        }
                    });
                }
            }
        });
    }
}
