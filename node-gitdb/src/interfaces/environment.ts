export interface IEnvironment {
    production: boolean;
    host: string;
    port: number;
    database: {
        mountpoint: string;
        repo: string;
        branch: string;
        path: string;
    }
}