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

import { AppServer, NewCommand } from 'kodeblox';
import { AdminRoles } from './adminRoles';
import { BgsChannel } from './bgsChannel';
import { BgsReport } from './bgsReport';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function allCommands(server: AppServer): [command: NewCommand, ...args: any[]][] {
  return [[AdminRoles], [BgsChannel], [BgsReport, server]];
}
