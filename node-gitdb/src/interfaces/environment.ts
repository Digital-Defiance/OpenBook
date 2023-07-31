import { IGitOperations } from "./gitOperations";

export interface IEnvironment {
    production: boolean;
    host: string;
    port: number;
    database: IGitOperations;
    index: {
        file: string;    
        path: string;
    }
}