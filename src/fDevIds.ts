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

import axios from 'axios';

export interface IdProperty {
  [item: string]: {
    name: string;
  };
}

export interface IngameIdsSchema {
  state: IdProperty;
  superpower: IdProperty;
  economy: IdProperty;
  government: IdProperty;
  security: IdProperty;
  station: IdProperty;
  happiness: IdProperty;
}

export class FDevIds {
  private static ids: IngameIdsSchema;

  static async initialiseIds(): Promise<void> {
    const url = 'https://elitebgs.app/api/ingameids/all';

    const response = await axios.get<IngameIdsSchema>(url);
    if (response.status == 200) {
      const body: IngameIdsSchema = response.data;
      if (body) {
        FDevIds.ids = body;
      } else {
        throw new Error(response.statusText);
      }
    } else {
      throw new Error(response.statusText);
    }
  }

  static async getIds(): Promise<IngameIdsSchema> {
    if (FDevIds.ids) {
      return FDevIds.ids;
    } else {
      await FDevIds.initialiseIds();
      return FDevIds.ids;
    }
  }
}
