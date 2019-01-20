/*
 * KodeBlox Copyright 2019 Sayak Mukhopadhyay
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

import * as request from 'request-promise-native';
import { IngameIdsSchema } from "./interfaces/typings";
import { OptionsWithUrl, FullResponse } from 'request-promise-native';

export class FdevIds {
    private static ids: IngameIdsSchema;

    static async initialiseIds() {
        let requestOptions: OptionsWithUrl = {
            url: "https://elitebgs.app/ingameids/all",
            json: true,
            resolveWithFullResponse: true
        }

        let response: FullResponse = await request.get(requestOptions);
        if (response.statusCode == 200) {
            let body: IngameIdsSchema = response.body;
            if (body) {
                FdevIds.ids = body;
            } else {
                throw new Error(response.statusMessage);
            }
        } else {
            throw new Error(response.statusMessage);
        }
    }

    static async getIds() {
        if (FdevIds.ids) {
            return FdevIds.ids;
        } else {
            await FdevIds.initialiseIds();
            return FdevIds.ids;
        }
    }
}
