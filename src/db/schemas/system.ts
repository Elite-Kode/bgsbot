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

import { Schema } from 'mongoose';

export let systemSchema: Schema = new Schema({
    system_name: {
        type: String,
        unique: true
    },
    system_name_lower: String,
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: Date,
    system_faction: String,
    system_faction_lower: String,
    faction_state: String,
    system_allegiance: String,
    system_economy: String,
    system_government: String,
    system_security: String,
    factions: [{
        _id: false,
        faction_name: String,
        faction_name_lower: String,
        updated_at: Date,
        faction_state: String,
        faction_government: String,
        faction_influence: Number,
        faction_pending_states: [{
            _id: false,
            state: String,
            trend: Number
        }],
        faction_recovering_states: [{
            _id: false,
            state: String,
            trend: Number
        }]
    }],
    powers: [String],
    powerplay_state: String
});
