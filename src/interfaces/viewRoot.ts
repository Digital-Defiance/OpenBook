export interface IViewRoot {
    version: number;
    options: {
        includeFileName?: boolean;
    };
    columns: {
        [columnName: string]: string;
    };
}