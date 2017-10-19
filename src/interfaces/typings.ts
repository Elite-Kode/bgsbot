import * as mongoosePaginate from 'mongoose-paginate';
import { PaginateResult } from 'mongoose';

export interface EBGSFactionV3Schema {
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

export interface EBGSSystemV3Schema {
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

interface EBGSFactionV3SchemaWOHistory {
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

export interface EBGSSystemV3SchemaWOHistory {
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

export type EBGSFactionsV3 = PaginateResult<EBGSFactionV3Schema>;
export type EBGSSystemsV3 = PaginateResult<EBGSSystemV3Schema>;
export type EBGSFactionsV3WOHistory = PaginateResult<EBGSFactionV3SchemaWOHistory>;
export type EBGSSystemsV3WOHistory = PaginateResult<EBGSSystemV3SchemaWOHistory>;
