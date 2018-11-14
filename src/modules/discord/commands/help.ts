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
import { Responses } from '../responseDict';
import { Message, RichEmbed, MessageReaction, User } from 'discord.js';
import { HelpSchema } from '../../../interfaces/typings';

export class Help {
    helpArray: HelpSchema[];
    displayState: number;
    helpDepth: number;
    helpMessageID: string;
    numberSelected: number;
    emojiArray = ["1⃣", "2⃣", "3⃣", "4⃣", "5⃣", "6⃣", "7⃣", "8⃣", "9⃣", "🔟"];
    constructor() {
        this.helpArray = [];
        this.displayState = 0;
        this.helpDepth = 0;
        this.helpMessageID = null;
    }
    exec(message: discord.Message, commandArguments: string): void {
        let argsArray: string[] = [];
        if (commandArguments.length !== 0) {
            argsArray = commandArguments.split(" ");
        }
        if (argsArray.length === 0) {
            message.channel.send("I have DM'd the help documents to you");
            this.display(message);
        } else {
            message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
        }
    }

    addHelp(helpObject: HelpSchema): void {
        let indexOfHelp = this.helpArray.findIndex(help => {
            return help.command === helpObject.command;
        });
        if (indexOfHelp === -1) {
            this.helpArray.push(helpObject);
        } else {
            this.helpArray[indexOfHelp] = helpObject;
        }
    }

    emojiCaught(msgReaction: MessageReaction, user: User): void {
        var index = this.emojiArray.indexOf(msgReaction.emoji.toString());
        if (index !== -1) {
            this.numberSelected = index + 1;
            msgReaction.message.delete();
            this.helpDepth++;
            this.display(msgReaction.message);
        } else if (msgReaction.emoji.toString() === "◀") {
            this.displayState--;
            msgReaction.message.delete();
            this.display(msgReaction.message);
        } else if (msgReaction.emoji.toString() === "▶") {
            this.displayState++;
            msgReaction.message.delete();
            this.display(msgReaction.message);
        } else if (msgReaction.emoji.toString() === "⬅") {
            msgReaction.message.delete();
            this.helpDepth--;
            this.display(msgReaction.message);
        }
    }

    display(message: Message): void {
        let embed = new discord.RichEmbed();
        embed.setColor(6684774);
        embed.setTitle(`:grey_question: BGSBot Help`);
        embed.setDescription(`Help Associated with BGSBot commands`);

        let length = this.helpArray.length;

        let displayArray: HelpSchema[][] = [];
        for (let i = 0; i < length / 10; i++) {
            displayArray.push(this.helpArray.slice(i * 10, (i + 1) * 10));
        }

        let maxDisplayState = displayArray.length - 1;
        let displayCommands = displayArray[this.displayState];

        if (this.helpDepth === 0) {
            this.helpList(displayCommands, embed, message)
                .then(returnMessage => {
                    this.helpMessageID = (returnMessage as Message).id
                    this.helpEmoji(displayCommands, this.displayState, maxDisplayState, returnMessage as Message);
                })
                .catch(err => {
                    console.log(err);
                });
        } else if (this.helpDepth === 1) {
            this.helpDescription(this.helpArray[this.displayState * 10 + this.numberSelected - 1], embed, message)
                .then(returnMessage => {
                    this.helpMessageID = (returnMessage as Message).id;
                    (returnMessage as Message).react("⬅")
                        .catch(err => {
                            console.log(err);
                        });
                })
                .catch(err => {
                    console.log(err);
                });
        }
    }

    helpList(displayCommands: HelpSchema[], embed: RichEmbed, message: Message) {
        displayCommands.forEach((help, index) => {
            embed.addField(`${index + 1}. ${help.command}`, help.helpMessage);
        });

        if (message.member) {
            return message.member.send(embed);
        } else {
            return message.channel.send(embed);
        }
    }

    async helpEmoji(displayCommands: HelpSchema[], displayState: number, maxDisplayState: number, message: Message) {
        try {
            if (displayState !== 0) {
                await message.react("◀");
            }
            for (let index = 0; index < displayCommands.length; index++) {
                await message.react(this.emojiArray[index]);
            }
            if (displayState < maxDisplayState) {
                await message.react("▶");
            }
        } catch (err) {
            console.log(err);
        }
    }

    helpDescription(command: HelpSchema, embed: RichEmbed, message: Message) {
        embed.addField("Command:", `@BGSBot ${command.command}`);
        embed.addField("Description", command.helpMessage);
        embed.addField("Template", command.template);
        let exampleString = "";
        command.example.forEach((example, index, examples) => {
            exampleString = exampleString + (index + 1) + ". " + example + "\n";
        });
        embed.addField("Examples", exampleString);

        if (message.member) {
            return message.member.send(embed);
        } else {
            return message.channel.send(embed);
        }
    }

    help() {
        return [
            'help',
            'Gets this help document in a DM',
            'help',
            [
                '`@BGSBot help`'
            ]
        ];
    }
}
