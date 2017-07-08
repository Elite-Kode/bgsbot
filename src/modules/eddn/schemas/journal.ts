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

export class Journal {
    public static readonly schemaId: string = "http://schemas.elite-markets.net/eddn/journal/1";
    private message: any;
    private timestamp: string;
    private event: Event;
    private starSystem: string;
    private starPos: number[];
    private misc: any;

    constructor(message: any) {
        this.message = message;
        this.timestamp = message.timestamp;
        this.event = message.event;
        this.starSystem = message.StarSystem;
        this.starPos = message.StarPos;
        this.initialiseMisc(message);
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
}

export enum Event {
    Docked,
    FSDJump,
    Scan
}
