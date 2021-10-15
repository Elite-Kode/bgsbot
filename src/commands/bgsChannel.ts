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

import { Message, MessageEmbed, Permissions } from 'discord.js';
import { Access, ADMIN, Command, FORBIDDEN, LoggingClient, Responses } from 'kodeblox';
import { ChannelTypes } from 'discord.js/typings/enums';
import { Schema } from 'mongoose';

import { BgsModel } from '../schemas/bgs';

export class BgsChannel implements Command {
  respondDm = false;
  sendDm = false;
  respondAsDm: boolean;
  calls = ['adminroles', 'arl'];
  dmCalls = [];
  arguments = {
    set: this.set.bind(this),
    s: this.set.bind(this),
    remove: this.remove.bind(this),
    r: this.remove.bind(this),
    show: this.show.bind(this),
    sh: this.show.bind(this)
  };

  constructor() {
    this.respondAsDm = false;
  }

  exec(message: Message, _commandArguments: string, argsArray: string[]): void {
    try {
      if (argsArray.length > 0) {
        type ArgumentKeys = keyof typeof this.arguments;
        const allowedArguments = Object.keys(this.arguments) as Array<ArgumentKeys>;
        const command = argsArray[0].toLowerCase() as ArgumentKeys;
        if (!allowedArguments.includes(command)) {
          message.channel.send(Responses.getResponse(Responses.NOT_A_COMMAND));
          return;
        }
        this.arguments[command](message, argsArray);
      } else {
        message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      }
    } catch (err) {
      LoggingClient.error(err);
    }
  }

  async set(message: Message, argsArray: string[]): Promise<void> {
    try {
      await Access.has(message.author, message.guild, [ADMIN, FORBIDDEN]);
      if (argsArray.length === 2) {
        const guildId = message.guild?.id;
        const bgsChannelId = argsArray[1];

        if (guildId && message.guild?.channels.cache.has(bgsChannelId)) {
          try {
            const channel = message.guild.channels.cache.get(bgsChannelId);
            if (channel && channel.type !== ChannelTypes.GUILD_TEXT.toString()) {
              try {
                await message.channel.send(Responses.getResponse(Responses.FAIL));
                message.channel.send(Responses.getResponse(Responses.NOT_A_TEXT_CHANNEL));
              } catch (err) {
                LoggingClient.error(err);
              }
            } else {
              await message.channel.send(Responses.getResponse(Responses.FAIL));
              message.channel.send(Responses.getResponse(Responses.NOT_A_TEXT_CHANNEL));
            }
            const guild = await BgsModel.findOneAndUpdate(
              { guild_id: new Schema.Types.ObjectId(guildId) },
              {
                bgs_channel_id: bgsChannelId
              }
            );
            if (guild) {
              message.channel.send(Responses.getResponse(Responses.SUCCESS));
            } else {
              try {
                await message.channel.send(Responses.getResponse(Responses.FAIL));
                message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
              } catch (err) {
                LoggingClient.error(err);
              }
            }
            const flags = Permissions.FLAGS;
            if (channel && !message.guild.me?.permissionsIn(channel).has([flags.EMBED_LINKS, flags.SEND_MESSAGES])) {
              try {
                message.channel.send(Responses.getResponse(Responses.EMBED_PERMISSION));
              } catch (err) {
                LoggingClient.error(err);
              }
            }
          } catch (err) {
            message.channel.send(Responses.getResponse(Responses.FAIL));
            LoggingClient.error(err);
          }
        } else {
          message.channel.send(Responses.getResponse(Responses.ID_NOT_FOUND));
        }
      } else if (argsArray.length > 2) {
        message.channel.send(Responses.getResponse(Responses.TOO_MANY_PARAMS));
      } else {
        message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      }
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
    }
  }

  async remove(message: Message, argsArray: string[]): Promise<void> {
    try {
      await Access.has(message.author, message.guild, [ADMIN, FORBIDDEN]);
      if (argsArray.length === 1) {
        const guildId = message.guild?.id;
        try {
          if (guildId) {
            const guild = await BgsModel.findOneAndUpdate(
              { guild_id: new Schema.Types.ObjectId(guildId) },
              {
                $unset: { bgs_channel_id: 1 }
              }
            );
            if (guild) {
              message.channel.send(Responses.getResponse(Responses.SUCCESS));
            } else {
              try {
                await message.channel.send(Responses.getResponse(Responses.FAIL));
                message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
              } catch (err) {
                LoggingClient.error(err);
              }
            }
          } else {
            await message.channel.send(Responses.getResponse(Responses.FAIL));
            message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
          }
        } catch (err) {
          message.channel.send(Responses.getResponse(Responses.FAIL));
          LoggingClient.error(err);
        }
      } else {
        message.channel.send(Responses.getResponse(Responses.TOO_MANY_PARAMS));
      }
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
    }
  }

  async show(message: Message, argsArray: string[]): Promise<void> {
    try {
      await Access.has(message.author, message.guild, [ADMIN, FORBIDDEN]);
      if (argsArray.length === 1) {
        const guildId = message.guild?.id;

        try {
          if (guildId) {
            const guild = await BgsModel.findOne({ guild_id: new Schema.Types.ObjectId(guildId) });
            if (guild) {
              if (guild.bgs_channel_id && guild.bgs_channel_id.length !== 0) {
                const embed = new MessageEmbed();
                embed.setTitle('BGS Channel');
                embed.setColor([255, 0, 255]);
                let id = '';
                if (message.guild.channels.cache.has(guild.bgs_channel_id)) {
                  id = `${guild.bgs_channel_id} - @${
                    message.guild?.channels?.cache?.get(guild.bgs_channel_id)?.name
                  }\n`;
                } else {
                  id = `${guild.bgs_channel_id} - Does not exist in Discord. Please delete this from BGSBot`;
                }
                embed.addField('Ids and Names', id);
                embed.setTimestamp(new Date());
                try {
                  message.channel.send({ embeds: [embed] });
                } catch (err) {
                  LoggingClient.error(err, {
                    metaData: {
                      guild: guild._id
                    }
                  });
                }
              } else {
                try {
                  await message.channel.send(Responses.getResponse(Responses.FAIL));
                  message.channel.send("You don't have a bgs channel set up");
                } catch (err) {
                  LoggingClient.error(err, {
                    metaData: {
                      guild: guild._id
                    }
                  });
                }
              }
            } else {
              try {
                await message.channel.send(Responses.getResponse(Responses.FAIL));
                message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
              } catch (err) {
                LoggingClient.error(err);
              }
            }
          } else {
            await message.channel.send(Responses.getResponse(Responses.FAIL));
            message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
          }
        } catch (err) {
          message.channel.send(Responses.getResponse(Responses.FAIL));
          LoggingClient.error(err);
        }
      } else if (argsArray.length > 1) {
        message.channel.send(Responses.getResponse(Responses.TOO_MANY_PARAMS));
      } else {
        message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      }
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
    }
  }

  help(): [string, string, string, string[]] {
    return [
      'bgschannel(aliases: bcl)',
      'Sets, removes or shows the channel set up for BGS reporting',
      'bgschannel <set|remove|show> <channel id>\nbgschannel <s|r|sh> <channel id>',
      [
        '`@BGSBot bgschannel set 1234564789012345678`',
        '`@BGSBot bcl s 1234564789012345678`',
        '`@BGSBot bgschannel remove`',
        '`@BGSBot bcl remove`',
        '`@BGSBot bgschannel show`',
        '`@BGSBot bgschannel sh`'
      ]
    ];
  }
}
