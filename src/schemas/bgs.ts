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

import { Document, model, Schema, ObjectId } from 'mongoose';

export interface Bgs {
  guild_id: ObjectId;
  bgs_channel_id: string;
  bgs_roles_id: string[];
  bgs_time: string;
  announce_tick: boolean;
  sort: string;
  sort_order: number;
  theme: string;
  created_at: Date;
  updated_at: Date;
  monitor_systems: {
    primary: boolean;
    system_name: string;
    system_name_lower: string;
    system_pos: {
      x: number;
      y: number;
      z: number;
    };
  }[];
  monitor_factions: {
    primary: boolean;
    faction_name: string;
    faction_name_lower: string;
  }[];
}

export interface IBgsSchema extends Document, Bgs {}

export const BgsSchema = new Schema<IBgsSchema>(
  {
    guild_id: {
      type: Schema.Types.ObjectId,
      required: true
    },
    bgs_channel_id: String,
    bgs_roles_id: [String],
    bgs_time: String,
    announce_tick: Boolean,
    sort: String,
    sort_order: Number, // 1 of increasing and -1 for decreasing and 0 for disable
    theme: String,
    monitor_systems: [
      {
        _id: false,
        primary: Boolean,
        system_name: String,
        system_name_lower: String,
        system_pos: {
          x: Number,
          y: Number,
          z: Number
        }
      }
    ],
    monitor_factions: [
      {
        _id: false,
        primary: Boolean,
        faction_name: String,
        faction_name_lower: String
      }
    ]
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

export const BgsModel = model('BGS', BgsSchema, 'bgs');
