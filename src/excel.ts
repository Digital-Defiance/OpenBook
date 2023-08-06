import { Workbook, Worksheet } from 'exceljs';
import { Stream } from "stream";
import { GitDB } from "./database/gitdb";

export class GitDBExcel {
    private gitDb: GitDB;
    constructor(gitDb: GitDB) {
        this.gitDb = gitDb;
    }

    public async getViewAsExcel(table: string, workbook: Workbook): Promise<Worksheet> {
        if (!this.gitDb.hasViewJson(table)) {
            throw new Error(`Table ${table} does not exist`);
        }
        const viewData = await this.gitDb.getCondensedView(table);
        const worksheet = workbook.addWorksheet(table);
        viewData.forEach(dataRow => {
            const row = worksheet.addRow(dataRow);
            row.commit();
        });
        worksheet.commit();
        return worksheet;
    }
}