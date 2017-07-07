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

import * as zlib from 'zlib';
import * as zmq from 'zmq';
import * as ajv from 'ajv';

import { Blackmarket, Commodity, Journal, Outfitting, Shipyard } from './schemas';

export class Eddn {
    public static readonly relay = 'tcp://eddn.edcd.io:9500';
    private socket: zmq.Socket;

    constructor() {
        this.socket = zmq.socket('sub');
        this.connectToRelay();
        this.listenToRelay();
    }

    private connectToRelay(): void {
        this.socket.connect(Eddn.relay);
        console.log('Connected to EDDN relay at port 9500');
        this.socket.subscribe('');
        console.log('Subscribed to EDDN');
    }

    private listenToRelay(): void {
        this.socket.on('message', topic => {
            let message = JSON.parse(zlib.inflateSync(topic).toString());
            console.log(message);
            switch (message['$schemaRef']) {
                case Blackmarket.schemaId: Blackmarket.test();
                    break;
                case Commodity.schemaId: Commodity.test();
                    break;
                case Journal.schemaId: Journal.test();
                    break;
                case Outfitting.schemaId: Outfitting.test();
                    break;
                case Shipyard.schemaId: Shipyard.test();
                    break;
                default: console.log("Schema not Found");
            }
        });
    }
}
