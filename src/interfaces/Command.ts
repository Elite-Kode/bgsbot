import { Message } from "discord.js";

export interface Command {
    dmAble: boolean;

    exec(message: Message, commandArguments: string): void;

    help(): [string, string, string, string[]];
}
