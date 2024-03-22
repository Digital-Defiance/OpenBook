import { AOA2SheetOpts, Sheet2HTMLOpts, WritingOptions } from 'xlsx';
import { ConfigParams } from "hyperformula";

export interface IViewRoot {
    version: number;
    options: {
        includeFileName?: boolean;
        // see: https://hyperformula.handsontable.com/api/interfaces/configparams.html
        formula?: Partial<ConfigParams>;
        // see: https://docs.sheetjs.com/docs/api/utilities/array
        sheet?: AOA2SheetOpts;
        // see: https://docs.sheetjs.com/docs/api/utilities/html
        html?: Sheet2HTMLOpts;
        // see: https://docs.sheetjs.com/docs/api/write-options
        excel?: WritingOptions;
    };
    columns: {
        [columnName: string]: string;
    };
}