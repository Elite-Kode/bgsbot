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

export let guildSchema: Schema = new Schema({
    guild_id: {
        type: String,
        unique: true
    },
    bgs_channel_id: String,
    bgs_role_id: String,
    admin_roles_id: [String],
    forbidden_roles_id: [String],
    created_at: {
        type: Date,
        default: Date.now
    },
    monitor_systems: [{
        _id: false,
        system_name: String,
        system_pos: {
            x: Number,
            y: Number,
            z: Number
        }
    }],
    monitor_factions: [{
        _id: false,
        faction_name: String
    }]
});
