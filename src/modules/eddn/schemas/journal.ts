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
    public static readonly schemaId: string = "http://schemas.elite-markets.net/eddn/journal/1/test";
    private message: any;
    private timestamp: string;
    private event: string;
    private starSystem: string;
    private starPos: number[];
    private misc: any;
    private db: DB

    constructor(message: any) {
        this.message = JSON.parse(JSON.stringify(message));
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
                let factionNameArray = [];
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
                            pendingStateObject.trend = pendingState.Trend;
                            factionObject.faction_pending_states.push(pendingStateObject);
                        });
                    }
                    factionObject.faction_recovering_states = [];
                    if (faction.RecoveringStates) {
                        faction.RecoveringStates.forEach(recoveringState => {
                            let recoveringStateObject: any = {};
                            recoveringStateObject.state = recoveringState.State;
                            recoveringStateObject.trend = recoveringState.Trend;
                            factionObject.faction_pending_states.push(recoveringStateObject);
                        });
                    }
                    factionObject.updated_at = new Date();
                    factionArray.push(factionObject);
                    factionNameArray.push(factionObject.faction_name_lower);
                });
                let updateObject: any = {
                    system_name: this.starSystem,
                    system_faction: this.misc.SystemFaction,
                    system_faction_lower: this.misc.SystemFaction.toLowerCase(),
                    faction_state: this.misc.FactionState,
                    system_allegiance: this.misc.SystemAllegiance,
                    system_economy: this.misc.SystemEconomy,
                    system_government: this.misc.SystemGovernment,
                    system_security: this.misc.SystemSecurity,
                    factions: factionArray
                };
                if (this.misc.Powers) {
                    updateObject.powers = this.misc.Powers;
                    updateObject.powerplay_state = this.misc.PowerplayState;
                }
                this.db.model.system.findOneAndUpdate(
                    { system_name_lower: this.starSystem.toLowerCase() },
                    updateObject
                )
                    .then(system => {
                        // console.log(system);
                    })
                    .catch(err => {
                        console.log(err);
                    });
                this.db.model.faction.find({
                    $or: [
                        { faction_name_lower: { $in: factionNameArray } },
                        { "faction_presence.system_name": this.starSystem }
                    ]
                })
                    .then(factions => {
                        if (factions) {
                            factions.forEach(faction => {
                                let readFaction: any;
                                let indexOfFaction = factionArray.findIndex(x => x.faction_name === faction.faction_name);
                                let indexOfSystem = faction.faction_presence.findIndex(x => x.system_name_lower === this.starSystem.toLowerCase());
                                if (indexOfSystem !== -1) {
                                    faction.faction_presence.splice(indexOfSystem, 1);
                                }
                                if (indexOfFaction !== -1) {
                                    readFaction = factionArray[indexOfFaction];
                                    faction.faction_government = readFaction.faction_government;
                                    let presenceObject: any = {};

                                    presenceObject.system_name = this.starSystem;
                                    presenceObject.system_name_lower = this.starSystem.toLowerCase();
                                    presenceObject.influence = readFaction.faction_influence;
                                    presenceObject.state = readFaction.faction_state;
                                    if (this.misc.SystemFaction === faction.faction_name) {
                                        presenceObject.isControlling = true;
                                    } else {
                                        presenceObject.isControlling = false;
                                    }
                                    presenceObject.pending_states = readFaction.faction_pending_states;
                                    presenceObject.recovering_states = readFaction.faction_recovering_states;
                                    presenceObject.updated_at = new Date();
                                    faction.faction_presence.push(presenceObject);
                                }
                                this.db.model.faction.findOneAndUpdate(
                                    { faction_name_lower: faction.faction_name_lower },
                                    faction
                                )
                                    .then(faction => {
                                        // console.log(faction);
                                    })
                                    .catch(err => {
                                        console.log(err);
                                    })
                            });
                        }
                    })
            }
        }
    }
}
