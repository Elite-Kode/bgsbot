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

import { PaginateResult } from 'mongoose';
import { CronJob } from 'cron';

interface EBGSFactionPresence {
  system_id: string;
  system_name: string;
  system_name_lower: string;
  state: string;
  influence: number;
  happiness: string;
  active_states: {
    state: string;
  }[];
  pending_states: {
    state: string;
    trend: number;
  }[];
  recovering_states: {
    state: string;
    trend: number;
  }[];
  conflicts: EBGSFactionConflict[];
  updated_at: string;
}

export interface EBGSFactionConflict {
  type: string;
  status: string;
  opponent_name: string;
  opponent_name_lower: string;
  opponent_faction_id: string;
  station_id: string;
  stake: string;
  stake_lower: string;
  days_won: number;
  system_id: string;
  system_name: string;
}

export interface EBGSFactionSystemDetails extends EBGSFactionPresence {
  system_details: EBGSSystemSchema;
  controlling: boolean;
}

export interface EBGSFactionHistory {
  _id: string;
  __v: number;
  system_id: string;
  updated_at: string;
  updated_by: string;
  system: string;
  system_lower: string;
  state: string;
  influence: number;
  happiness: string;
  active_states: {
    state: string;
  }[];
  pending_states: {
    state: string;
    trend: number;
  }[];
  recovering_states: {
    state: string;
    trend: number;
  }[];
  systems: {
    name: string;
    name_lower: string;
  }[];
  conflicts: {
    type: string;
    status: string;
    opponent_name: string;
    opponent_name_lower: string;
    stake: string;
    stake_lower: string;
    days_won: number;
  }[];
}

export interface EBGSFactionHistoryDetailed extends Omit<EBGSFactionHistory, 'system' | 'system_lower' | 'system_id'> {
  faction_id: string;
  faction_name: string;
  faction_name_lower: string;
}

export interface EBGSFactionSchema extends EBGSFactionSchemaMinimal {
  faction_presence: EBGSFactionPresence[];
}

export interface EBGSFactionSystemSchema extends EBGSFactionSchemaMinimal {
  faction_presence: EBGSFactionPresence;
}

export interface EBGSFactionSchemaDetailed extends Omit<EBGSFactionSchema, 'faction_presence'> {
  faction_presence: EBGSFactionSystemDetails[];
  history: EBGSFactionHistory[];
  controlling: boolean;
}

export interface EBGSFactionSchemaMinimal {
  _id: string;
  __v: number;
  eddb_id: number;
  name: string;
  name_lower: string;
  updated_at: string;
  government: string;
  allegiance: string;
  home_system_name: string;
  is_player_faction: boolean;
}

export interface EBGSSystemFaction {
  faction_id: string;
  name: string;
  name_lower: string;
}

export interface EBGSSystemFactionDetails extends EBGSSystemFaction {
  faction_details: EBGSFactionSystemSchema;
}

export interface EBGSSystemSchema extends EBGSSystemSchemaMinimal {
  factions: EBGSSystemFaction[];
  conflicts: {
    type: string;
    status: string;
    faction1: {
      faction_id: string;
      name: string;
      name_lower: string;
      station_id: string;
      stake: string;
      stake_lower: string;
      days_won: number;
    };
    faction2: {
      faction_id: string;
      name: string;
      name_lower: string;
      station_id: string;
      stake: string;
      stake_lower: string;
      days_won: number;
    };
  }[];
}

export interface EBGSSystemHistory {
  _id: string;
  updated_at: string;
  updated_by: string;
  population: number;
  government: string;
  allegiance: string;
  state: string;
  security: string;
  controlling_minor_faction: string;
  controlling_minor_faction_cased: string;
  controlling_minor_faction_id: string;
  factions: EBGSSystemFaction[];
  conflicts: {
    type: string;
    status: string;
    faction1: {
      name: string;
      name_lower: string;
      stake: string;
      stake_lower: string;
      days_won: number;
    };
    faction2: {
      name: string;
      name_lower: string;
      stake: string;
      stake_lower: string;
      days_won: number;
    };
  }[];
}

export interface EBGSSystemSchemaDetailed extends Omit<EBGSSystemSchema, 'factions'> {
  factions: EBGSSystemFactionDetails[];
  history: EBGSSystemHistory[];
  faction_history: EBGSFactionHistoryDetailed[];
}

export interface EBGSSystemSchemaMinimal {
  _id: string;
  __v: number;
  eddb_id: number;
  name: string;
  name_lower: string;
  x: number;
  y: number;
  z: number;
  system_address: string;
  population: number;
  government: string;
  allegiance: string;
  state: string;
  security: string;
  primary_economy: string;
  secondary_economy: string;
  needs_permit: boolean;
  reserve_type: string;
  controlling_minor_faction: string;
  controlling_minor_faction_cased: string;
  controlling_minor_faction_id: string;
  updated_at: string;
}

export interface EBGSStationSchemaDetailed extends EBGSStationSchema {
  history: EBGSStationHistory[];
}

export interface EBGSStationHistory {
  _id: string;
  updated_at: string;
  updated_by: string;
  government: string;
  allegiance: string;
  state: string;
  controlling_minor_faction: string;
  services: {
    name: string;
    name_lower: string;
  }[];
}

export interface EBGSStationSchema {
  _id: string;
  __v: number;
  eddb_id: number;
  name: string;
  name_lower: string;
  type: string;
  system: string;
  system_lower: string;
  updated_at: string;
  government: string;
  economy: string;
  all_economies: {
    name: string;
    proportion: number;
  }[];
  allegiance: string;
  state: string;
  market_id: string;
  distance_from_star: number;
  controlling_minor_faction: string;
  controlling_minor_faction_cased: string;
  controlling_minor_faction_id: string;
  services: {
    name: string;
    name_lower: string;
  }[];
}

export interface TickSchema {
  _id: string;
  time: string;
  updated_at: string;
}

export interface IngameIdsSchema {
  state: any;
  superpower: any;
  economy: any;
  government: any;
  security: any;
  station: any;
  happiness: any;
}

export type EBGSFactionsDetailed = PaginateResult<EBGSFactionSchemaDetailed>;
export type EBGSFactionsMinimal = PaginateResult<EBGSFactionSchemaMinimal>;
export type EBGSFactions = PaginateResult<EBGSFactionSchema>;

export type EBGSSystemsDetailed = PaginateResult<EBGSSystemSchemaDetailed>;
export type EBGSSystemsMinimal = PaginateResult<EBGSSystemSchemaMinimal>;

export type EBGSStationsDetailed = PaginateResult<EBGSStationSchemaDetailed>;
export type EBGSStations = PaginateResult<EBGSStationSchema>;

export type TickType = TickSchema[];

export interface CronJobStoreSchema {
  cronJob: CronJob;
  guildid: string;
  time: string;
}

export interface HelpSchema {
  command: string;
  helpMessage: string;
  template: string;
  example: string[];
}

export interface IngameIdsSchema {
  state: any;
  superpower: any;
  economy: any;
  government: any;
  security: any;
  station: any;
  happiness: any;
}

export type CronJobStore = CronJobStoreSchema;
