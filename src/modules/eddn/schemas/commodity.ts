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

export class Commodity {
    public static readonly schemaId: string = "http://schemas.elite-markets.net/eddn/commodity/3";
    private systemName: string;
    private stationName: string;
    private timestamp: string;
    private commodities: SingleCommodity;

    constructor(message: any) {
        this.systemName = message.systemName;
        this.stationName = message.stationName;
        this.timestamp = message.timestamp;
        this.commodities = new SingleCommodity(message.commodities);
    }

    public static test(): void {
        console.log("Test Commodity");
    }
}

export class SingleCommodity {
    private name: string;
    private meanPrice: number;
    private buyPrice: number;
    private stock: number;
    private stockBracket: any;
    private sellPrice: number;
    private demand: number;
    private demandBracket: any;
    private statusFlags: string[];

    constructor(commodity: any) {
        this.name = commodity.name;
        this.meanPrice = commodity.meanPrice;
        this.buyPrice = commodity.buyPrice;
        this.stock = commodity.stock;
        this.stockBracket = commodity.stockBracket;
        this.sellPrice = commodity.sellPrice;
        this.demand = commodity.demand;
        this.demandBracket = commodity.demandBracket;
        this.statusFlags = commodity.statusFlags;
    }
}
