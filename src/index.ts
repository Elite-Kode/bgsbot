/* eslint-disable @typescript-eslint/ban-ts-comment */
/*
 * Copyright 2021 Sayak Mukhopadhyay
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AppServer } from 'kodeblox';
import { config } from 'dotenv';
import { Intents } from 'discord.js';

config();

const appServer = new AppServer({
  // @ts-ignore
  port: process.env.BGSBOT_PORT,
  discord: {
    // @ts-ignore
    token: process.env.BGSBOT_DISCORD_TOKEN ?? '',
    client: {
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
      ]
    }
  }
});
appServer.server.on('listening', () => {
  console.log('weeheee');
});
