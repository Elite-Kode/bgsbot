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

import { Message } from 'discord.js';
import { Command } from "../../../interfaces/Command";

export class Hi implements Command {
    dmAble = true;

    exec(message: Message, commandArguments: string): void {
        if (commandArguments.length === 0) {
            message.channel.send("Hey there!");
        }
    }

    help(): [string, string, string, string[]] {
        return [
            'hi',
            'A sanity check to see if the bot is responding',
            'hi',
            [
                '`@BGSBot hi`'
            ]
        ];
    }
}
