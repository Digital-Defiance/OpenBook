export interface IFileNode {
    table: string;
    file: string;
    path: string;
    value?: string;
    indexingVersion: string;
    date: Date;
}