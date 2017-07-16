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

import * as mongoose from 'mongoose';
import { DBSecrets } from '../secrets';

import { guildSchema } from './schemas';

import { IModel, IGuildModel } from './models';

export class DB {
    private options: mongoose.ConnectionOptions;
    private userName: string;
    private password: string;
    private url: string;
    public model: IModel;

    constructor() {
        this.userName = DBSecrets.userName;
        this.password = DBSecrets.password;
        this.url = DBSecrets.url;
        this.model = Object();
        this.options = {
            server: {
                socketOptions: {
                    keepAlive: 120
                }
            },
            user: this.userName,
            pass: this.password
        };
        this.connectToDB();
    }

    connectToDB(): void {
        mongoose.connect(this.url, this.options, (err) => {
            if (err) {
                return console.log(err);
            }
        });
        this.listenToEvents();
        this.createModels();
    }

    listenToEvents(): void {
        mongoose.connection.on('connected', () => {
            console.log(`Connected to ${this.url}`);
        });

        mongoose.connection.on('error', err => {
            console.log(`Mongoose error ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Mongoose connection disconnected');
        });

        process.on('SIGINT', () => {
            mongoose.connection.close()
                .then(() => {
                    console.log('Connection closed via app termination');
                    process.exit(0);
                });
        });
    }

    createModels(): void {
        this.model.guild = mongoose.model<IGuildModel>("Guild", guildSchema);
    }
}

