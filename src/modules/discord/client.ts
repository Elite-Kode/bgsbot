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

export class DiscordClient {
    public client: discord.Client;

    constructor() {
        this.client = new discord.Client();
        this.login();
        this.listen();
    }

    public login() {
        this.client.login('MzMyODQ2NTA4ODg4MDMxMjMy.DEEEZA.64_sT9Qo-X8VrTSqFP4FqdDYhSc');
    }

    public listen() {
        this.client.on("ready", () => {
            console.log("I am ready!");
        });

        this.client.on("message", (message) => {
            if (message.content.startsWith("/")) {
                if (message.content.slice(1) === 'hi') {
                    message.channel.send("pong!");
                }
            }
        });
    }
}
