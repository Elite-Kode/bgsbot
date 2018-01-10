import * as mongoosePaginate from 'mongoose-paginate';
import { PaginateResult } from 'mongoose';
import { CronJob } from 'cron';

interface FactionSchema {
    _id: string;
    __v: number;
    id: number;
    name: string;
    name_lower: string;
    updated_at: string;
    government_id: number;
    government: string;
    allegiance_id: number;
    allegiance: string;
    state_id: number;
    state: string;
    home_system_id: number;
    is_player_faction: boolean;
}

interface PopulatedSystemSchema {
    _id: string;
    __v: number;
    id: number;
    edsm_id: number;
    name: string;
    name_lower: string;
    x: number;
    y: number;
    z: number;
    population: number;
    is_populated: boolean;
    government_id: number;
    government: string;
    allegiance_id: number;
    allegiance: string;
    state_id: number;
    state: string;
    security_id: number;
    security: string;
    primary_economy_id: number;
    primary_economy: string;
    power: string;
    power_state: string;
    power_state_id: number;
    needs_permit: boolean;
    updated_at: string;
    simbad_ref: string;
    controlling_minor_faction_id: number;
    controlling_minor_faction: string;
    reserve_type_id: number;
    reserve_type: string;
    minor_faction_presences: {
        _id: string;
        minor_faction_id: number;
        state_id: number;
        state: string;
        influence: number
    }[];
}

export interface EBGSFactionV4Schema {
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
    faction_presence: {
        system_name: string;
        system_name_lower: string;
        state: string;
        influence: number;
        pending_states: {
            state: string;
            trend: number;
        }[];
        recovering_states: {
            state: string;
            trend: number;
        }[];
    }[];
    history: {
        updated_at: string;
        updated_by: string;
        system: string;
        system_lower: string;
        state: string;
        influence: number;
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
    }[];
}

export interface EBGSSystemV4Schema {
    _id: string;
    __v: number;
    eddb_id: number;
    name: string;
    name_lower: string;
    x: number;
    y: number;
    z: number;
    population: number
    government: string;
    allegiance: string;
    state: string
    security: string;
    primary_economy: string;
    needs_permit: boolean
    reserve_type: string
    controlling_minor_faction: string;
    factions: {
        name: string;
        name_lower: string;
    }[];
    updated_at: string;
    history: {
        updated_at: string;
        updated_by: string;
        population: number;
        government: string;
        allegiance: string;
        state: string;
        security: string;
        controlling_minor_faction: string;
        factions: {
            name: string;
            name_lower: string;
        }[];
    }[];
}

interface EBGSFactionV4SchemaWOHistory {
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
    faction_presence: {
        system_name: string;
        system_name_lower: string;
        state: string;
        influence: number;
        pending_states: {
            state: string;
            trend: number;
        }[];
        recovering_states: {
            state: string;
            trend: number;
        }[];
    }[];
}

export interface EBGSSystemV4SchemaWOHistory {
    _id: string;
    __v: number;
    eddb_id: number;
    name: string;
    name_lower: string;
    x: number;
    y: number;
    z: number;
    population: number
    government: string;
    allegiance: string;
    state: string
    security: string;
    primary_economy: string;
    needs_permit: boolean
    reserve_type: string
    controlling_minor_faction: string;
    factions: {
        name: string;
        name_lower: string;
    }[];
    updated_at: string;
}

export interface CronJobStoreSchema {
    cronJob: CronJob;
    guildid: String;
    time: String;
}

export interface FieldRecordSchema {
    fieldTitle: string,
    fieldDescription: string,
    influence: number,
    name: string
}


export type FactionsV4 = PaginateResult<FactionSchema>;
export type PopulatedSystemsV4 = PaginateResult<PopulatedSystemSchema>;
export type EBGSFactionsV4 = PaginateResult<EBGSFactionV4Schema>;
export type EBGSSystemsV4 = PaginateResult<EBGSSystemV4Schema>;
export type EBGSFactionsV4WOHistory = PaginateResult<EBGSFactionV4SchemaWOHistory>;
export type EBGSSystemsV4WOHistory = PaginateResult<EBGSSystemV4SchemaWOHistory>;
export type CronJobStore = CronJobStoreSchema;
