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

import { Client, DMChannel, Message, User } from 'discord.js';
import { DiscordSecrets } from '../../secrets';
import { Responses } from './responseDict';
import {
    AdminRoles,
    BGSChannel,
    BGSReport,
    BGSRole,
    Chart,
    FactionStatus,
    ForbiddenRoles,
    Help,
    Hi,
    MonitorFactions,
    MonitorSystems,
    MyGuild,
    Sort,
    SystemStatus,
    Theme,
    Tick
} from './commands';
import { HouseKeeping } from './houseKeeping';
import { HelpSchema } from '../../interfaces/typings';
import App from '../../server';
import { DB } from '../../db';
import { Command } from "../../interfaces/Command";

export class DiscordClient {
    public client: Client;
    public commandsMap: Map<string, Command>;
    private houseKeeping: HouseKeeping;
    private db: DB;

    constructor() {
        this.client = new Client();
        this.commandsMap = new Map();
        this.login();
        this.listen();
    }

    public login() {
        this.client.login(DiscordSecrets.token);
    }

    public listen() {
        this.client.on("ready", () => {
            console.log("I am ready!");
            this.houseKeeping = new HouseKeeping();
            this.initiateCommands();
            this.createHelp();
        });

        this.client.on("message", async (message) => {
            if (message.channel.type === 'dm' && !message.author.bot) {
                this.processDm(message)
            } else if (message.mentions.users.filter(user => {
                if (user.id === this.client.user.id) {
                    return true;
                } else {
                    return false;
                }
            }).size > 0) {
                this.db = App.db;
                try {
                    this.processNormal(message)
                } catch (err) {
                    message.channel.send(Responses.getResponse(Responses.FAIL));
                    App.bugsnagClient.call(err);
                }
            }
        });

        this.client.on("messageReactionAdd", (messageReaction, user: User) => {
            let helpObject = this.commandsMap.get('help') as Help;
            let message = messageReaction.message
            if (!user.bot && message.embeds && message.embeds.length > 0 && message.embeds[0].title === helpObject.title) {
                helpObject.emojiCaught(messageReaction);
            }
        });

        this.client.on('raw', async packet => {
            if (['MESSAGE_REACTION_ADD'].includes(packet.t)) {
                let channel: DMChannel = await this.client.channels.fetch(packet.d.channel_id) as DMChannel;
                if (!channel.messages.cache.has(packet.d.message_id)) {
                    let message = await channel.messages.fetch(packet.d.message_id);
                    let emoji: string = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
                    let reaction = message.reactions.cache.get(emoji);
                    let user = await this.client.users.fetch(packet.d.user_id);
                    this.client.emit("messageReactionAdd", reaction, user);
                }
            }
        });

        this.client.on("channelDelete", channel => {
            this.houseKeeping.deletedChannel(channel);
        });

        this.client.on("roleDelete", role => {
            this.houseKeeping.deletedRole(role);
        });

        this.client.on("rateLimit", rateLimitInfo => {
            App.bugsnagClient.call(new Error("Discord Rate Limit Hit"), {
                metaData: rateLimitInfo
            });
        });
    }

    private initiateCommands(): void {
        let myGuild = new MyGuild();
        let bgsRole = new BGSRole();
        let adminRoles = new AdminRoles();
        let forbiddenRoles = new ForbiddenRoles();
        let bgaChannel = new BGSChannel();
        let monitorSystems = new MonitorSystems();
        let monitorFactions = new MonitorFactions();
        let systemStatus = new SystemStatus();
        let systemStatusDm = new SystemStatus(true);
        let factionStatus = new FactionStatus();
        let factionStatusDm = new FactionStatus(true);
        let bgsReport = new BGSReport();
        let bgsReportDm = new BGSReport(true);

        this.commandsMap.set("hi", new Hi());
        this.commandsMap.set("help", new Help());
        this.commandsMap.set("myguild", myGuild);
        this.commandsMap.set("mgd", myGuild);
        this.commandsMap.set("bgsrole", bgsRole);
        this.commandsMap.set("brl", bgsRole);
        this.commandsMap.set("adminroles", adminRoles);
        this.commandsMap.set("arl", adminRoles);
        this.commandsMap.set("forbiddenroles", forbiddenRoles);
        this.commandsMap.set("frl", forbiddenRoles);
        this.commandsMap.set("bgschannel", bgaChannel);
        this.commandsMap.set("bcl", bgaChannel);
        this.commandsMap.set("monitorsystems", monitorSystems);
        this.commandsMap.set("ms", monitorSystems);
        this.commandsMap.set("monitorfactions", monitorFactions);
        this.commandsMap.set("mf", monitorFactions);
        this.commandsMap.set("systemstatus", systemStatus);
        this.commandsMap.set("ss", systemStatus);
        this.commandsMap.set("systemstatusdm", systemStatusDm);
        this.commandsMap.set("ssdm", systemStatusDm);
        this.commandsMap.set("factionstatus", factionStatus);
        this.commandsMap.set("fs", factionStatus);
        this.commandsMap.set("factionstatusdm", factionStatusDm);
        this.commandsMap.set("fsdm", factionStatusDm);
        this.commandsMap.set("bgsreport", bgsReport);
        this.commandsMap.set("brt", bgsReport);
        this.commandsMap.set("bgsreportdm", bgsReportDm);
        this.commandsMap.set("brtdm", bgsReportDm);
        this.commandsMap.set("sort", new Sort());
        this.commandsMap.set("chart", new Chart());
        this.commandsMap.set("chartdm", new Chart(true));
        this.commandsMap.set("theme", new Theme());
        this.commandsMap.set("tick", new Tick());
        this.commandsMap.set("tickdm", new Tick(true));
    }

    createHelp(): void {
        this.commandsMap.forEach((value, key) => {
            let helpArray: [string, string, string, string[]] = value.help();
            let helpObject: HelpSchema = {
                command: helpArray[0],
                helpMessage: helpArray[1],
                template: helpArray[2],
                example: helpArray[3]
            };
            (this.commandsMap.get('help') as Help).addHelp(helpObject);
        });
    }

    public getCommandArguments(message: Message) {
        //removed replace(/\s+/g, ' ') since its causing issues with faction names with multiple spaces
        let messageString = message.content.replace(new RegExp(`<@!?${this.client.user.id}>`), "").trim();
        let messageArray = messageString.split(" ");
        let command = messageArray[0].toLowerCase();
        let commandArguments: string = "";
        if (messageArray.length > 1) {
            commandArguments = messageArray.slice(1, messageArray.length).join(" ");
        }
        return {command, commandArguments}
    }

    public processNormal(message: Message): void {
        let commandArguments = this.getCommandArguments(message);
        if (this.commandsMap.has(commandArguments.command)) {
            console.log(commandArguments.command + " command requested");
            this.commandsMap.get(commandArguments.command).exec(message, commandArguments.commandArguments);
        } else {
            message.channel.send(Responses.getResponse(Responses.NOTACOMMAND));
        }
    }

    public processDm(message: Message): void {
        let commandArguments = this.getCommandArguments(message);
        if (this.commandsMap.has(commandArguments.command) && this.commandsMap.get(commandArguments.command).dmAble) {
            console.log(commandArguments.command + " command requested");
            this.commandsMap.get(commandArguments.command).exec(message, commandArguments.commandArguments);
        } else {
            message.channel.send(Responses.getResponse(Responses.NOTACOMMAND));
        }
    }
}
