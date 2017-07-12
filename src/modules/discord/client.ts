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
import { Hi, Help, MyGuild, BGSRole, AdminRoles, ForbiddenRoles, BGSChannel, MonitorSystems, MonitorFactions, SystemStatus, FactionStatus } from './commands';

export class DiscordClient {
    public client: discord.Client;
    private commandsMap = new Map();

    constructor() {
        this.client = new discord.Client();
        this.login();
        this.listen();
        this.initiateCommands();
    }

    public login() {
        this.client.login(DiscordSecrets.token);
    }

    public listen() {
        this.client.on("ready", () => {
            console.log("I am ready!");
        });

        this.client.on("message", (message) => {
            if (message.content.startsWith("/")) {
                let messageString = message.content.replace(/ +/g, ' ').replace(/\n/g, "\\n").trim();
                let messageArray = messageString.split(" ");
                let command = messageArray[0].toLowerCase().substring(1);
                let commandArguments: string = "";
                if (messageArray.length > 1) {
                    commandArguments = messageArray.slice(1, messageArray.length).join(" ");
                }
                if (this.commandsMap.has(command)) {
                    console.log(command + " command requested");
                    let commander = new (this.commandsMap.get(command))();
                    commander.exec(message, commandArguments);
                } else {
                    message.channel.send(Responses.getResponse(Responses.NOTACOMMAND));
                }
            }
        });
    }

    private initiateCommands(): void {
        this.commandsMap.set("hi", Hi);
        this.commandsMap.set("help", Help);
        this.commandsMap.set("myguild", MyGuild);
        this.commandsMap.set("bgsrole", BGSRole);
        this.commandsMap.set("adminroles", AdminRoles);
        this.commandsMap.set("forbiddenroles", ForbiddenRoles);
        this.commandsMap.set("bgschannel", BGSChannel);
        this.commandsMap.set("monitorsystems", MonitorSystems);
        this.commandsMap.set("monitorfactions", MonitorFactions);
        this.commandsMap.set("systemstatus", SystemStatus);
        this.commandsMap.set("factionstatus", FactionStatus);
    }
}
