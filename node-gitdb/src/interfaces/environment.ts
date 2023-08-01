import { IGitOperations } from "./gitOperations";
import { IMongo } from "./mongo";

export interface IEnvironment {
    production: boolean;
    host: string;
    port: number;
    gitdb: IGitOperations;
    mongo: IMongo;
}