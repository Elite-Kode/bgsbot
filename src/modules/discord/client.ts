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

import * as discord from 'discord.js';
import { DiscordSecrets } from '../../secrets';
import { Responses } from './responseDict';
import { Hi, Help, MyGuild, BGSRole, AdminRoles, ForbiddenRoles, BGSChannel, BGSFaction, MonitorSystems, MonitorFactions, SystemStatus, FactionStatus, BGSReport, Sort, Chart, Theme, Purge} from './commands';
import { HouseKeeping } from './houseKeeping';
import { HelpSchema } from '../../interfaces/typings';
import App from '../../server';
import { DB } from '../../db/index';
import { CustomFunctionality } from './custom'

export class DiscordClient {
    public client: discord.Client;
    public commandsMap: Map<string, any>;
    private houseKeeping: HouseKeeping;
    private db: DB;
    private custom: CustomFunctionality;

    constructor() {
        this.client = new discord.Client();
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
            this.initiateCustom();
        });

        this.client.on("message", (message) => {
            if (message.mentions.users.filterArray(user => {
                if (user.id === this.client.user.id) {
                    return true;
                } else {
                    return false;
                }
            }).length > 0) {
                this.db = App.db;
                this.db.model.guild.findOne({
                    guild_id: message.guild.id,
                    'custom.set': true
                }).then(guild => {
                    if (guild) {
                        this.custom[`g${guild.guild_id}`].exec(message);
                    } else {
                        this.processNormal(message)
                    }
                }).catch(err => {
                    message.channel.send(Responses.getResponse(Responses.FAIL));
                    console.log(err);
                })
            }
        });

        this.client.on("messageReactionAdd", (messageReaction, user) => {
            let helpObject = this.commandsMap.get('help') as Help;
            if (!user.bot && messageReaction.message.id === helpObject.helpMessageID) {
                if (!messageReaction.users.has(this.client.user.id)) {
                    messageReaction.remove(user);
                }
                helpObject.emojiCaught(messageReaction, user);
            }
        });

        this.client.on("channelDelete", channel => {
            this.houseKeeping.deletedChannel(channel);
        });

        this.client.on("roleDelete", role => {
            this.houseKeeping.deletedRole(role);
        })
    }

    private initiateCommands(): void {
        this.commandsMap.set("hi", new Hi());
        this.commandsMap.set("help", new Help());
        this.commandsMap.set("myguild", new MyGuild());
        this.commandsMap.set("bgsrole", new BGSRole());
        this.commandsMap.set("adminroles", new AdminRoles());
        this.commandsMap.set("bgsfaction", new BGSFaction());
        this.commandsMap.set("forbiddenroles", new ForbiddenRoles());
        this.commandsMap.set("bgschannel", new BGSChannel());
        this.commandsMap.set("monitorsystems", new MonitorSystems());
        this.commandsMap.set("monitorfactions", new MonitorFactions());
        this.commandsMap.set("systemstatus", new SystemStatus());
        this.commandsMap.set("factionstatus", new FactionStatus());
        this.commandsMap.set("bgsreport", new BGSReport());
        this.commandsMap.set("sort", new Sort());
        this.commandsMap.set("chart", new Chart());
        this.commandsMap.set("theme", new Theme());
        this.commandsMap.set("purge", new Purge());
    }

    private initiateCustom(): void {
        this.custom = new CustomFunctionality();
    }

    createHelp(): void {
        this.commandsMap.forEach((value, key) => {
            let helpArray: [string, string, string, string[]] = value.help();
            let helpObject: HelpSchema = {
                command: helpArray[0],
                helpMessage: helpArray[1],
                template: helpArray[2],
                example: helpArray[3]
            }
            this.commandsMap.get('help').addHelp(helpObject);
        });
    }

    public getCommandArguments(message: discord.Message) {
        //removed replace(/\s+/g, ' ') since its causing issues with faction names with multiple spaces
        let messageString = message.content.replace(new RegExp(`<@!?${this.client.user.id}>`), "").trim();
        let messageArray = messageString.split(" ");
        let command = messageArray[0].toLowerCase();
        let commandArguments: string = "";
        if (messageArray.length > 1) {
            commandArguments = messageArray.slice(1, messageArray.length).join(" ");
        }
        return { command, commandArguments }
    }

    public processNormal(message: discord.Message): void {
        let commandArguments = this.getCommandArguments(message);
        if (this.commandsMap.has(commandArguments.command)) {
            console.log(commandArguments.command + " command requested");
            this.commandsMap.get(commandArguments.command).exec(message, commandArguments.commandArguments);
        } else {
            message.channel.send(Responses.getResponse(Responses.NOTACOMMAND));
        }
    }
}
