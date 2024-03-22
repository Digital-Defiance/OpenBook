import { Sheet2HTMLOpts, utils} from 'xlsx';
import { GitDB } from "./gitdb";

export abstract class GitDBHtml {
    private constructor() {
        // Private constructor to prevent instantiation
    }

    public static async getTableAsHtml(gitDb: GitDB, table: string): Promise<string> {
        const viewRoot = gitDb.getViewJson(table);
        const sheet = await gitDb.index.getViewSheet(table);
        const htmlOptions: Sheet2HTMLOpts = {
            header: `<html><head><meta charset="utf-8"/><title>${table}</title></head><body><h1>${table}</h1><br />`,
            ...viewRoot.options.html
        }
        return utils.sheet_to_html(sheet, htmlOptions);
    }
}