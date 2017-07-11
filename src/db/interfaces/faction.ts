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

export interface IFaction {
    faction_name: string,
    faction_name_lower: string,
    faction_state: string,
    faction_government: string,
    faction_influence: number,
    faction_pending_states: [{
        state: string,
        trend: number
    }],
    faction_recovering_states: [{
        state: string,
        trend: number
    }],
    systems_in_control: [{
        name: string,
        name_lower: string
    }]
}
