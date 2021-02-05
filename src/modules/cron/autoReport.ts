/*
 * KodeBlox Copyright 2017 Sayak Mukhopadhyay
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

import { CronJob } from 'cron';
import { IGuildModel } from '../../db/models';
import { Client, GuildChannel, Permissions, TextChannel } from 'discord.js';
import { CronJobStore } from '../../interfaces/typings';
import { BGSReport } from '../discord/commands';
import App from '../../server';
import { Responses } from "../discord/responseDict";

export class AutoReport {
    private static jobs: CronJobStore[] = [];

    public static initiateJob(guilds: IGuildModel[], client: Client) {
        guilds.forEach(guild => {
            if (guild.bgs_time && guild.bgs_time.length > 0 && guild.bgs_channel_id && guild.bgs_channel_id.length > 0) {
                try {
                    let cronPattern = `${guild.bgs_time.split(':')[2]} ${guild.bgs_time.split(':')[1]} ${guild.bgs_time.split(':')[0]} * * *`;
                    let cronJob = new CronJob(cronPattern, async () => {
                        try {
                            console.log('CRONjob execute');
                            let bgsChannel: GuildChannel = client.guilds.cache.get(guild.guild_id).channels.cache.get(guild.bgs_channel_id);
                            if (bgsChannel && bgsChannel.type === 'text') {
                                let bgsReport = new BGSReport();
                                let embedArray = await bgsReport.getBGSReportEmbed(guild.guild_id, bgsChannel as TextChannel);
                                for (let index = 0; index < embedArray.length; index++) {
                                    await (bgsChannel as TextChannel).send(embedArray[index]);
                                }
                            } else {
                                console.log(`BGS Channel for Guild ${guild.guild_id} has not been set up`)
                            }
                        } catch (err) {
                            App.bugsnagClient.call(err, {
                                metaData: {
                                    time: guild.bgs_time,
                                    guild: guild._id
                                }
                            });
                        }
                    });
                    this.jobs.push({
                        cronJob: cronJob,
                        guildid: guild.guild_id,
                        time: guild.bgs_time
                    });
                    cronJob.start();
                } catch (err) {
                    App.bugsnagClient.call(err, {
                        metaData: {
                            time: guild.bgs_time,
                            guild: guild._id
                        }
                    });
                }
            }
        });
    }

    public static createJob(guild: IGuildModel, client: Client) {
        if (guild.bgs_time && guild.bgs_time.length > 0 && guild.bgs_channel_id && guild.bgs_channel_id.length > 0) {
            if (this.jobs.findIndex(element => {
                return element.guildid === guild.guild_id;
            }) !== -1) {
                this.editJob(guild, client);
            } else {
                try {
                    let cronPattern = `${guild.bgs_time.split(':')[2]} ${guild.bgs_time.split(':')[1]} ${guild.bgs_time.split(':')[0]} * * *`;
                    let cronJob = new CronJob(cronPattern, async () => {
                        let bgsChannel: GuildChannel = client.guilds.cache.get(guild.guild_id).channels.cache.get(guild.bgs_channel_id);
                        if (bgsChannel && bgsChannel.type === 'text') {
                            let flags = Permissions.FLAGS;
                            if (bgsChannel.guild.me.permissionsIn(bgsChannel).has([flags.EMBED_LINKS])) {
                                let bgsReport = new BGSReport();
                                let embedArray = await bgsReport.getBGSReportEmbed(guild.guild_id, bgsChannel as TextChannel);
                                for (let index = 0; index < embedArray.length; index++) {
                                    await (bgsChannel as TextChannel).send(embedArray[index]);
                                }
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
                        } else {
                            console.log(`BGS Channel for Guild ${guild.guild_id} has not been set up`)
                        }
                    });
                    this.jobs.push({
                        cronJob: cronJob,
                        guildid: guild.guild_id,
                        time: guild.bgs_time
                    });
                    cronJob.start();
                } catch (err) {
                    App.bugsnagClient.call(err, {
                        metaData: {
                            time: guild.bgs_time,
                            guild: guild._id
                        }
                    });
                }
            }
        }
    }

    public static editJob(guild: IGuildModel, client: Client) {
        if (guild.bgs_time && guild.bgs_time.length > 0 && guild.bgs_channel_id && guild.bgs_channel_id.length > 0) {
            let indexOfJob = this.jobs.findIndex(element => {
                return element.guildid === guild.guild_id;
            });
            if (indexOfJob !== -1) {
                let existingCronJob = this.jobs[indexOfJob].cronJob;
                existingCronJob.stop();
                try {
                    let cronPattern = `${guild.bgs_time.split(':')[2]} ${guild.bgs_time.split(':')[1]} ${guild.bgs_time.split(':')[0]} * * *`;
                    let cronJob = new CronJob(cronPattern, async () => {
                        let bgsChannel: GuildChannel = client.guilds.cache.get(guild.guild_id).channels.cache.get(guild.bgs_channel_id);
                        if (bgsChannel && bgsChannel.type === 'text') {
                            let bgsReport = new BGSReport();
                            let embedArray = await bgsReport.getBGSReportEmbed(guild.guild_id, bgsChannel as TextChannel);
                            for (let index = 0; index < embedArray.length; index++) {
                                await (bgsChannel as TextChannel).send(embedArray[index]);
                            }
                        } else {
                            console.log(`BGS Channel for Guild ${guild.guild_id} has not been set up`)
                        }
                    });
                    this.jobs[indexOfJob].cronJob = cronJob;
                    this.jobs[indexOfJob].time = guild.bgs_time;
                    cronJob.start();
                } catch (err) {
                    App.bugsnagClient.call(err, {
                        metaData: {
                            time: guild.bgs_time,
                            guild: guild._id
                        }
                    });
                    console.log(`Time ${guild.bgs_time} is not a suitable cron time`);
                }
            }
        }
    }

    public static deleteJob(guild: IGuildModel, client: Client) {
        let indexOfJob = this.jobs.findIndex(element => {
            return element.guildid === guild.guild_id;
        });
        if (indexOfJob !== -1) {
            let existingCronJob = this.jobs[indexOfJob].cronJob;
            existingCronJob.stop();
            this.jobs.splice(indexOfJob);
        }
    }
}
