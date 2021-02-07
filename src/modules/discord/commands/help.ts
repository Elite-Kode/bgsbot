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

import { Message, MessageEmbed, MessageReaction } from 'discord.js';
import App from '../../../server';
import { Responses } from '../responseDict';
import { HelpSchema } from '../../../interfaces/typings';
import { Command } from "../../../interfaces/Command";

export class Help implements Command {
    helpArray: HelpSchema[];
    emojiArray = ["1⃣", "2⃣", "3⃣", "4⃣", "5⃣", "6⃣", "7⃣", "8⃣", "9⃣", "🔟"];
    title = ':grey_question: BGSBot Help';
    dmAble = true;

    constructor() {
        this.helpArray = [];
    }

    exec(message: Message, commandArguments: string): void {
        let argsArray: string[] = [];
        if (commandArguments.length !== 0) {
            argsArray = commandArguments.split(" ");
        }
        if (argsArray.length === 0) {
            message.channel.send("I have DM'd the help documents to you");
            this.display(message, 1, null);
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

    emojiCaught(msgReaction: MessageReaction): void {
        let index = this.emojiArray.indexOf(msgReaction.emoji.toString());
        let messageEmbed = msgReaction.message.embeds[0];
        let page = messageEmbed.fields.find(field => field.name === 'PAGE');
        if (index !== -1) {
            msgReaction.message.delete();
            this.display(msgReaction.message, +page.value, index);
        } else if (msgReaction.emoji.toString() === "◀") {
            msgReaction.message.delete();
            this.display(msgReaction.message, +page.value - 1, null);
        } else if (msgReaction.emoji.toString() === "▶") {
            msgReaction.message.delete();
            this.display(msgReaction.message, +page.value + 1, null);
        } else if (msgReaction.emoji.toString() === "⬅") {
            msgReaction.message.delete();
            this.display(msgReaction.message, +page.value, null);
        }
    }

    async display(message: Message, page: number, item: number) {
        let embed = new MessageEmbed();
        embed.setColor(6684774);
        embed.setTitle(this.title);
        embed.setDescription(`Help Associated with BGSBot commands`);

        if (!item) {
            let length = this.helpArray.length;

            let displayArray: HelpSchema[][] = [];
            for (let i = 0; i < length / 10; i++) {
                displayArray.push(this.helpArray.slice(i * 10, (i + 1) * 10));
            }

            let maxDisplayState = displayArray.length;
            let displayCommands = displayArray[page - 1];
            try {
                let returnMessage = await this.helpList(displayCommands, embed, message, page);
                this.helpEmoji(displayCommands, page, maxDisplayState, returnMessage as Message);
            } catch (err) {
                App.bugsnagClient.call(err);
            }
        } else {
            try {
                let returnMessage = await this.helpDescription(this.helpArray[(page - 1) * 10 + item], embed, message, page);
                (returnMessage as Message).react("⬅");
            } catch (err) {
                App.bugsnagClient.call(err);
            }
        }
    }

    async helpList(displayCommands: HelpSchema[], embed: MessageEmbed, message: Message, page: number) {
        displayCommands.forEach((help, index) => {
            embed.addField(`${index + 1}. ${help.command}`, help.helpMessage);
        });
        embed.addField("PAGE", page);

        let member = message.member;
        if (member) {
            return member.send(embed);
        } else {
            return message.channel.send(embed);
        }
    }

    async helpEmoji(displayCommands: HelpSchema[], displayState: number, maxDisplayState: number, message: Message) {
        if (displayState > 1) {
            await message.react("◀");
        }
        for (let index = 0; index < displayCommands.length; index++) {
            await message.react(this.emojiArray[index]);
        }
        if (displayState < maxDisplayState) {
            await message.react("▶");
        }
    }

    async helpDescription(command: HelpSchema, embed: MessageEmbed, message: Message, page: number) {
        embed.addField("Command:", `@BGSBot ${command.command}`);
        embed.addField("Description", command.helpMessage);
        embed.addField("Template", command.template);
        let exampleString = "";
        command.example.forEach((example, index) => {
            exampleString = exampleString + (index + 1) + ". " + example + "\n";
        });
        embed.addField("Examples", exampleString);
        embed.addField("PAGE", page);

        let member = message.member;
        if (member) {
            return member.send(embed);
        } else {
            return message.channel.send(embed);
        }
    }

    help(): [string, string, string, string[]] {
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
