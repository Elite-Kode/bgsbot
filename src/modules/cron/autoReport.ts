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
import { IGuildModel } from '../../db/models/index';
import { Client, GuildChannel, TextChannel } from 'discord.js';
import { CronJobStore } from '../../interfaces/typings';
import { BGSReport } from '../discord/commands/bgsReport';

export class AutoReport {
    private static jobs: CronJobStore[] = [];

    public static initiateJob(guilds: IGuildModel[], client: Client) {
        guilds.forEach(guild => {
            if (guild.bgs_time && guild.bgs_time.length > 0 && guild.bgs_channel_id && guild.bgs_channel_id.length > 0) {
                try {
                    let cronPattern = `${guild.bgs_time.split(':')[2]} ${guild.bgs_time.split(':')[1]} ${guild.bgs_time.split(':')[0]} * * *`;
                    let cronJob = new CronJob(cronPattern, () => {
                        console.log('CRONjob execute');
                        try{
                            let bgsChannel: GuildChannel = client.guilds.get(guild.guild_id).channels.get(guild.bgs_channel_id);
                            if (bgsChannel && bgsChannel.type === 'text') {
                                let bgsReport = new BGSReport();
                                bgsReport.getBGSReportEmbed(guild.guild_id)
                                    .then(embedArray => {
                                        (async (bgsChannel, embedArray) => {
                                            for (let index = 0; index < embedArray.length; index++) {
                                                try {
                                                    await (bgsChannel as TextChannel).send(embedArray[index]);
                                                } catch (err) {
                                                    console.log(err);
                                                }
                                            }
                                        })(bgsChannel, embedArray);
                                    });
                            } else {
                                console.log(`Guild ${guild.guild_id} has not been set up`)
                            }
                        } catch (err) {
                            console.log(err);
                            console.log('Guild id: '+guild.guild_id);
                            console.log('Client Guild size: '+client.guilds.size);
                        }
                    });
                    this.jobs.push({
                        cronJob: cronJob,
                        guildid: guild.guild_id,
                        time: guild.bgs_time
                    });
                    cronJob.start();
                }
                catch (err) {
                    console.log(err);
                    console.log(`Time ${guild.bgs_time} is not a suitable cron time`);
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
                    let cronJob = new CronJob(cronPattern, () => {
                        let bgsChannel: GuildChannel = client.guilds.get(guild.guild_id).channels.get(guild.bgs_channel_id);
                        if (bgsChannel && bgsChannel.type === 'text') {
                            let bgsReport = new BGSReport();
                            bgsReport.getBGSReportEmbed(guild.guild_id)
                                .then(embedArray => {
                                    (async (bgsChannel, embedArray) => {
                                        for (let index = 0; index < embedArray.length; index++) {
                                            try {
                                                await (bgsChannel as TextChannel).send(embedArray[index]);
                                            } catch (err) {
                                                console.log(err);
                                            }
                                        }
                                    })(bgsChannel, embedArray);
                                });
                        } else {
                            console.log(`Guild ${guild.guild_id} has not been set up`)
                        }
                    });
                    this.jobs.push({
                        cronJob: cronJob,
                        guildid: guild.guild_id,
                        time: guild.bgs_time
                    });
                    cronJob.start();
                }
                catch (err) {
                    console.log(err);
                    console.log(`Time ${guild.bgs_time} is not a suitable cron time`);
                }
            }
        }
    }

    public static editJob(guild: IGuildModel, client: Client) {
        if (guild.bgs_time && guild.bgs_time.length > 0 && guild.bgs_channel_id && guild.bgs_channel_id.length > 0) {
            let indexOfJob = this.jobs.findIndex(element => {
                return element.guildid === guild.guild_id;
            });
            if (indexOfJob === -1) {
                this.createJob(guild, client);
            } else {
                let existingCronJob = this.jobs[indexOfJob].cronJob;
                existingCronJob.stop();
                try {
                    let cronPattern = `${guild.bgs_time.split(':')[2]} ${guild.bgs_time.split(':')[1]} ${guild.bgs_time.split(':')[0]} * * *`;
                    let cronJob = new CronJob(cronPattern, () => {
                        let bgsChannel: GuildChannel = client.guilds.get(guild.guild_id).channels.get(guild.bgs_channel_id);
                        if (bgsChannel && bgsChannel.type === 'text') {
                            let bgsReport = new BGSReport();
                            bgsReport.getBGSReportEmbed(guild.guild_id)
                                .then(embedArray => {
                                    (async (bgsChannel, embedArray) => {
                                        for (let index = 0; index < embedArray.length; index++) {
                                            try {
                                                await (bgsChannel as TextChannel).send(embedArray[index]);
                                            } catch (err) {
                                                console.log(err);
                                            }
                                        }
                                    })(bgsChannel, embedArray);
                                });
                        } else {
                            console.log(`Guild ${guild.guild_id} has not been set up`)
                        }
                    });
                    this.jobs[indexOfJob].cronJob = cronJob;
                    this.jobs[indexOfJob].time = guild.bgs_time;
                    cronJob.start();
                }
                catch (err) {
                    console.log(err);
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
