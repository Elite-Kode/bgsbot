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
import App from '../../../server';
import { Responses } from '../responseDict';
import { Access } from './../access';

export class Purge{
    exec(message: discord.Message, commandArguments: string): void {
        let argsArray: string[] = [];
        if (commandArguments.length !== 0) {
            argsArray = commandArguments.split(" ");
        }
        if (argsArray.length > 0) {
            let command = argsArray[0].toLowerCase();
            if (this[command]) {
                this[command](message, argsArray); 
            } else {
				message.channel.send(Responses.getResponse(Responses.NOTACOMMAND));
            }
        } else {
            message.channel.send(Responses.getResponse(Responses.NOPARAMS));
        }
    }

    channel(message: discord.Message, argsArray: string[]) {
       // Only the server admins can purge the channel
       Access.has(message.member, [Access.ADMIN, Access.FORBIDDEN])
            .then(() => {
		        if (argsArray.length === 1) {
					message.channel.send("Purging the channel!");
					// Fetch 100 messages (will be filtered and lowered up to max amount requested)
					message.channel.fetchMessages({
					 limit: 100,
					})
					.then((messages) => {
					 message.channel.bulkDelete(messages).catch(error => console.log(error.stack));
					});			
					message.channel.send(Responses.getResponse(Responses.SUCCESS));
		        } else {
		            message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
		        }
			})
			.catch(() => {
               message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
			})    
	}

	
	help() {
        return [
            'hi',
            'A sanity check to see if the bot is responding',
            'purge',
            [
                '`@BGSBot purge`'
            ]
        ];
    }
}
