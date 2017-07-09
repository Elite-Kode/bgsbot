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

import { DB } from '../../../db/index';
import App from '../../../server';

export class Journal {
    public static readonly schemaId: string = "http://schemas.elite-markets.net/eddn/journal/1";
    private message: any;
    private timestamp: string;
    private event: string;
    private starSystem: string;
    private starPos: number[];
    private misc: any;
    private db: DB

    constructor(message: any) {
        this.message = message;
        this.timestamp = message.timestamp;
        this.event = message.event;
        this.starSystem = message.StarSystem;
        this.starPos = message.StarPos;
        this.initialiseMisc(message);
        this.db = App.db;
    }

    initialiseMisc(message): void {
        delete message.timestamp;
        delete message.event;
        delete message.StarSystem;
        delete message.StarPos;
        this.misc = message;
    }

    display(): void {
        console.log(this.message);
    }

    trackSystem(): void {
        if (this.event === "FSDJump") {
            if (this.misc.Factions) {
                let factionArray = [];
                this.misc.Factions.forEach(faction => {
                    let factionObject: any = {};
                    factionObject.faction_name = faction.Name;
                    factionObject.faction_name_lower = faction.Name.toLowerCase();
                    factionObject.faction_state = faction.FactionState;
                    factionObject.faction_government = faction.Government;
                    factionObject.faction_influence = faction.Influence;
                    factionObject.faction_pending_states = [];
                    if (faction.PendingStates) {
                        faction.PendingStates.forEach(pendingState => {
                            let pendingStateObject: any = {};
                            pendingStateObject.state = pendingState.State;
                            pendingStateObject.trend = pendingState.trend;
                            factionObject.faction_pending_states.push(pendingStateObject);
                        });
                    }
                    factionObject.faction_recovering_states = [];
                    if (faction.RecoveringStates) {
                        faction.RecoveringStates.forEach(recoveringState => {
                            let recoveringStateObject: any = {};
                            recoveringStateObject.state = recoveringState.State;
                            recoveringStateObject.trend = recoveringState.trend;
                            factionObject.faction_pending_states.push(recoveringStateObject);
                        });
                    }
                    factionArray.push(factionObject);
                });
                this.db.model.system.findOneAndUpdate(
                    { system_name_lower: this.starSystem.toLowerCase() },
                    {
                        system_name: this.starSystem,
                        system_faction: this.misc.SystemFaction,
                        system_faction_lower: this.misc.SystemFaction.toLowerCase(),
                        faction_state: this.misc.FactionState,
                        system_allegiance: this.misc.SystemAllegiance,
                        system_economy: this.misc.SystemEconomy,
                        system_government: this.misc.SystemGovernment,
                        system_security: this.misc.SystemSecurity,
                        factions: factionArray
                        // powers: this.misc.Powers,
                        // powerplay_state: this.misc.PowerplayState
                    })
                    .then(system => {
                        // console.log(system);
                    })
                    .catch(err => {
                        console.log(err);
                    })
            }
        }
    }
}
