import { Message } from "discord.js";

export interface Command {
    exec(message: Message, commandArguments: string): void;

    help(): [string, string, string, string[]];
}
