import { Workbook, Worksheet } from 'exceljs';
import { GitDB } from './gitdb';

export class GitDBExcel {
    private gitDb: GitDB;
    constructor(gitDb: GitDB) {
        this.gitDb = gitDb;
    }

    public async getViewAsExcel(table: string, workbook: Workbook): Promise<Worksheet> {
        if (!this.gitDb.hasViewJson(table)) {
            throw new Error(`Table ${table} does not exist`);
        }
        const viewData = await this.gitDb.index.getCondensedView(table);
        const worksheet = workbook.addWorksheet(table);
        let header = true;
        viewData.forEach((dataRow, rowIndex) => {
            const processedRow = dataRow.map(cellData => {
                if (typeof cellData === 'string' && cellData.startsWith('=')) {
                    // If it's an equation, return it as a formula object without the '=' prefix
                    return { formula: cellData.substring(1) };
                }
                return cellData;
            });
            const row = worksheet.addRow(processedRow);
            if (header) {
                row.eachCell((cell, colNumber) => {
                    cell.font = { bold: true };
                });
                header = false;
            }
            row.commit();
        });
        worksheet.commit();
        return worksheet;
    }
}
