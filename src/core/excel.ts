import { GitDB } from './gitdb';
import { utils, write } from 'xlsx';

export abstract class GitDBExcel {
    private constructor() {
        // Private constructor to prevent instantiation
    }

    public static async getViewAsExcel(gitDb: GitDB, table: string): Promise<Buffer> {
        const viewRoot = gitDb.getViewJson(table);
        const workbook = utils.book_new();
        const sheet = await gitDb.index.getViewSheet(table);
        utils.book_append_sheet(workbook, sheet, table);
        return write(workbook, { type: 'buffer', bookType: 'xlsx', ...viewRoot.options.excel });
    }
}
