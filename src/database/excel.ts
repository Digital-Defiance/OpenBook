import { Workbook, Worksheet } from 'exceljs';
import { GitDB } from './gitdb';

export class GitDBExcel {
    private gitDb: GitDB;
    constructor(gitDb: GitDB) {
        this.gitDb = gitDb;
    }

    private getVariables(currentRowIndex: number, row_count: number) {
        return {
            '{{CURRENT_ROW}}': currentRowIndex,
            '{{CURRENT_ROW-1}}': currentRowIndex - 1,
            '{{CURRENT_ROW+1}}': currentRowIndex + 1,
            '{{CURRENT_ROW-2}}': currentRowIndex - 2,
            '{{CURRENT_ROW+2}}': currentRowIndex + 2,
            '{{ROW_COUNT}}': row_count,
            '{{ROW_COUNT-1}}': row_count - 1,
            '{{ROW_COUNT+1}}': row_count + 1,
            '{{ROW_COUNT-2}}': row_count - 2,
            '{{ROW_COUNT+2}}': row_count + 2,
        }
    }

    private performSubstitutions(formula: string, currentRowIndex: number, row_count: number) {
        const variables = this.getVariables(currentRowIndex, row_count);
        Object.keys(variables).forEach(variable => {
            formula = formula.replace(variable, variables[variable].toString());
        });
        return formula;
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
                    return { formula: this.performSubstitutions(cellData.substring(1), rowIndex, viewData.length) };
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
