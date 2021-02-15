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

import { IngameIdsSchema } from "./interfaces/typings";
import axios from "axios";

export class FdevIds {
    private static ids: IngameIdsSchema;

    static async initialiseIds() {
        let url = "https://elitebgs.app/ingameids/all";

        let response = await axios.get(url);
        if (response.status == 200) {
            let body: IngameIdsSchema = response.data;
            if (body) {
                FdevIds.ids = body;
            } else {
                throw new Error(response.statusText);
            }
        } else {
            throw new Error(response.statusText);
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
