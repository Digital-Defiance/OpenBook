import { Cell, Workbook, Worksheet } from 'exceljs';
import { GitDB } from './gitdb';

export class GitDBExcel {
    private gitDb: GitDB;
    constructor(gitDb: GitDB) {
        this.gitDb = gitDb;
    }

    private getVariables(currentRowIndex: number, currentColumnIndex: number, row_count: number) {
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
            '{{CURRENT_COLUMN}}': currentColumnIndex,
            '{{CURRENT_COLUMN-1}}': currentColumnIndex - 1,
            '{{CURRENT_COLUMN+1}}': currentColumnIndex + 1,
            '{{CURRENT_COLUMN-2}}': currentColumnIndex - 2,
            '{{CURRENT_COLUMN+2}}': currentColumnIndex + 2,
        }
    }

    private performSubstitutions(formula: string, currentRowIndex: number, currentColumnIndex: number, row_count: number) {
        const variables = this.getVariables(currentRowIndex, currentColumnIndex, row_count);
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
            const row = worksheet.addRow(dataRow);
            if (header) {
                row.eachCell((cell, colNumber) => {
                    cell.font = { bold: true };
                });
                header = false;
            } else {
                row.eachCell((cell: Cell, colNumber: number) => {
                    // if the cell starts with =, it is a formula, we need to perform substitutions
                    // if the cell starts with =$, it is a formula, but we need to format it as currency 
                    // if the cell starts with $ or -$, we need to interpret it as a number but format it as a currency

                    const cellValue = cell.value.toString();
                    if (cellValue.startsWith('=$')) {
                        cell.value = <any>{
                            formula: this.performSubstitutions(cellValue.substring(2), rowIndex, colNumber, viewData.length),
                            result: undefined
                        };
                        cell.numFmt = '"$"#,##0.00';
                    } else if (cellValue.startsWith('=')) {
                        cell.value = <any>{
                            formula: this.performSubstitutions(cellValue.substring(1), rowIndex, colNumber, viewData.length),
                            result: undefined
                        };
                    } else if (cellValue.startsWith('$') || cellValue.startsWith('-$')) {
                        cell.value = parseFloat(cellValue.replace('$', '').replace(',', ''));
                        cell.numFmt = '"$"#,##0.00';
                    }
                });
            }
            row.commit();
        });
        worksheet.commit();
        return worksheet;
    }
}
