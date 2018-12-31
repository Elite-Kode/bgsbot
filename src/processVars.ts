import { Version } from './version'

export class ProcessVars {
    public static version: string;

    constructor() {
        ProcessVars.version = Version;
    }
}
