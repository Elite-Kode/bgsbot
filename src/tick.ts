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

import { TickSchema, TickType } from './typings/elitebgs';
import axios from 'axios';

export async function getTickData(): Promise<TickSchema> {
  const url = 'https://elitebgs.app/api/ebgs/v5/ticks';

  const response = await axios.get(url);
  if (response.status == 200) {
    const body: TickType = response.data;
    if (body.length === 0) {
      throw new Error('No tick data received');
    } else {
      return body[0];
    }
  } else {
    throw new Error(response.statusText);
  }
}
