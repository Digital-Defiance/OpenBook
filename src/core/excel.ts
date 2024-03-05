import { Cell, Workbook, Worksheet } from 'exceljs';
import { IBaseVariables } from '../interfaces/baseVariables';
import { GitDB } from './gitdb';

export class GitDBExcel {
    private gitDb: GitDB;
    constructor(gitDb: GitDB) {
        this.gitDb = gitDb;
    }

    private columnNumberToLetter(colNumber: number): string {
        if (colNumber < 1) {
            return 'A';
        }
        // A = 1, Z = 26, AA = 27, AB = 28, etc.
        const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        while (colNumber > 0) {
            const remainder = colNumber % 26;
            result = base[remainder - 1] + result;
            colNumber = Math.floor(colNumber / 26);
        }
        return result;
    }

    /**
     * Given a set of base variables, return a map of variables that can be used in a formula, including offsets.
     * This produces CURRENT_ROW+1, CURRENT_ROW-1, etc.
     * @param baseVars The base variables to use
     * @returns A map of variables including offsets that can be used in a formula
     */
    private getVariables(baseVars: IBaseVariables): Map<string, string> {
        const offsets = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const variables = new Map<string, string>();

        for (const key in baseVars) {
            variables.set(`{{${key}}}`, baseVars[key].toString());
            offsets.forEach(offset => {
                variables.set(`{{${key}${offset >= 0 ? '+' : ''}${offset}}}`, (baseVars[key] + offset).toString());
            });
        }
        // do CURRENT_COLUMN_LETTER and offsets
        variables.set(`{{CURRENT_COLUMN_LETTER}}`, this.columnNumberToLetter(baseVars['CURRENT_COLUMN']));
        offsets.forEach(offset => {
            const colNumber = baseVars['CURRENT_COLUMN'] + offset;
            variables.set(`{{CURRENT_COLUMN_LETTER${offset >= 0 ? '+' : ''}${offset}}}`, this.columnNumberToLetter(colNumber));
        });

        return variables;
    }

    private performSubstitutions(formula: string, baseVars: IBaseVariables) {
        const variables = this.getVariables(baseVars);
        variables.forEach((value, key) => {
            // Escape special characters for regex
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedKey, 'g');
            formula = formula.replace(regex, value.toString());
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
        viewData.forEach((dataRow: string[], rowIndex: number) => {
            const row = worksheet.addRow(dataRow);
            if (header) {
                row.eachCell((cell: Cell, colNumber: number) => {
                    cell.font = { bold: true };
                });
                header = false;
            } else {
                row.eachCell((cell: Cell, colNumber: number) => {
                    const substitutionVariables: IBaseVariables = {
                        CURRENT_COLUMN: colNumber,
                        CURRENT_ROW: rowIndex + 1,
                        ROW_COUNT: viewData.length,
                    };

                    // if the cell starts with =, it is a formula, we need to perform substitutions
                    // if the cell starts with =$, it is a formula, but we need to format it as currency 
                    // if the cell starts with $ or -$, we need to interpret it as a number but format it as a currency

                    const cellValue = cell.value.toString();
                    if (cellValue.startsWith('=$')) {
                        cell.value = <any>{
                            formula: this.performSubstitutions(cellValue.substring(2), substitutionVariables),
                            result: undefined
                        };
                        cell.numFmt = '"$"#,##0.00';
                    } else if (cellValue.startsWith('=')) {
                        cell.value = <any>{
                            formula: this.performSubstitutions(cellValue.substring(1), substitutionVariables),
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
