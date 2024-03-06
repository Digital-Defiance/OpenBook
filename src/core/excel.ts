import { Cell, Workbook, Worksheet } from 'exceljs';
import { IBaseVariables } from '../interfaces/baseVariables';
import { GitDB } from './gitdb';
import { GitDBFormula } from './formula';

export abstract class GitDBExcel {
    private constructor() {
        // Private constructor to prevent instantiation
    }

    public static async getViewAsExcel(gitDb: GitDB, table: string, workbook: Workbook): Promise<Worksheet> {
        if (!gitDb.hasViewJson(table)) {
            throw new Error(`Table ${table} does not exist`);
        }
        const viewData = await gitDb.index.getCondensedView(table);
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
                    if (cellValue.startsWith('!&&')) {
                        const result = GitDBFormula.extractFormattingFromFormula(cellValue);
                        cell.value = <any>{
                            formula: GitDBFormula.performVariableSubstitutionsOnFormula(result.formula, substitutionVariables),
                            result: undefined
                        };
                        if (result.formatting) {
                            cell.numFmt = result.formatting;
                        }
                    } else if (cellValue.startsWith('=')) {
                        cell.value = <any>{
                            formula: GitDBFormula.performVariableSubstitutionsOnFormula(cellValue, substitutionVariables),
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
