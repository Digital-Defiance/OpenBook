import { GitDBFormula } from "./formula";
import { AOA2SheetOpts, utils, Sheet2HTMLOpts } from 'xlsx';
import { GitDB } from "./gitdb";
import { ConfigParams } from "hyperformula";

export abstract class GitDBHtml {
    private constructor() {
        // Private constructor to prevent instantiation
    }

    public static async getTableAsHtml(gitDb: GitDB, table: string, formulaOptions?: Partial<ConfigParams>, sheetOptions?: AOA2SheetOpts, htmlOptions?: Sheet2HTMLOpts): Promise<string> {
        if (!gitDb.hasViewJson(table)) {
            throw new Error(`Table ${table} does not exist`);
        }
        let viewData = await gitDb.index.getCondensedView(table);
        viewData = GitDBFormula.performDataSubstitutions(viewData);
        viewData = GitDBFormula.calculateDataFormulas(viewData, formulaOptions);
        const sheet = utils.aoa_to_sheet(viewData, sheetOptions);
        return utils.sheet_to_html(sheet, htmlOptions);
    }
}