import { HyperFormula } from "hyperformula";
import { IBaseVariables } from '../interfaces/baseVariables';

export class GitDbFormula {
    private constructor() {
        // Private constructor to prevent instantiation
    }

    /**
     * Given a colunmn number (>0) return the letter representation of the column.
     * When colNumber is < 1, return 'A'.
     * @param colNumber The column number to convert to a letter
     * @returns The letter representation of the column
     */
    public static columnNumberToLetter(colNumber: number): string {
        if (colNumber < 1) {
            return 'A'; // Ensure we return 'A' for any column number less than 1.
        }
        let result = '';
        let num = colNumber;
        while (num > 0) {
            const remainder = (num - 1) % 26;
            result = String.fromCharCode(65 + remainder) + result;
            num = Math.floor((num - 1) / 26);
        }
        return result;
    }

    /**
     * Given a set of base variables, return a map of variables that can be used in a formula, including offsets.
     * This produces CURRENT_ROW+1, CURRENT_ROW-1, etc.
     * @param baseVars The base variables to use
     * @returns A map of variables including offsets that can be used in a formula
     */
    public static getVariables(baseVars: IBaseVariables): Map<string, string> {
        const variables = new Map<string, string>();

        for (const key in baseVars) {
            variables.set(`{{${key}}}`, baseVars[key].toString());
        }
        variables.set(`{{CURRENT_COLUMN_LETTER}}`, GitDbFormula.columnNumberToLetter(baseVars['CURRENT_COLUMN']));

        return variables;
    }

    /**
     * Given a formula and a set of base variables, perform substitutions and return the resulting formula.
     * @param formula The formula to perform substitutions on
     * @param baseVars The base variables to use
     * @returns The formula with substitutions performed
     */
    public static performVariableSubstitutions(formula: string, baseVars: IBaseVariables): string {
        formula = formula.replace(/\{\{CURRENT_(ROW|COLUMN)([+-]\d+)?\}\}/g, (match, type, offset) => {
            offset = offset ? parseInt(offset, 10) : 0;
            if (type === 'ROW') {
                let newRow = (baseVars['CURRENT_ROW'] || 0) + offset;
                newRow = Math.max(1, newRow);
                return newRow.toString();
            } else if (type === 'COLUMN') {
                let newCol = (baseVars['CURRENT_COLUMN'] || 0) + offset;
                // Ensure column number does not fall below 1, which corresponds to 'A'
                newCol = Math.max(1, newCol);
                return newCol.toString();
            }
            return '';
        });

        formula = formula.replace(/\{\{CURRENT_COLUMN_LETTER([+-]\d+)?\}\}/g, (match, offset) => {
            const baseColumn = baseVars['CURRENT_COLUMN'];
            let newColumnNumber = baseColumn + (offset ? parseInt(offset, 10) : 0);
            newColumnNumber = Math.max(1, newColumnNumber); // Correctly handle negative offsets
            return GitDbFormula.columnNumberToLetter(newColumnNumber);
        });

        const variables = GitDbFormula.getVariables(baseVars);
        variables.forEach((value, key) => {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedKey, 'g');
            formula = formula.replace(regex, value);
        });

        return formula;
    }

    public static performDataSubstitutions(inputData: string[][]): string[][] {
        const result: string[][] = [];
        // for each cell (row+col) in the input data, create a new IBaseVariables object and perform substitutions
        inputData.forEach((row, rowIndex) => {
            result[rowIndex] = [];
            row.forEach((cell, colIndex) => {
                if (cell.startsWith('=')) {
                    const baseVariables: IBaseVariables = {
                        CURRENT_COLUMN: colIndex + 1,
                        CURRENT_ROW: rowIndex + 1,
                        ROW_COUNT: inputData.length,
                    };
                    result[rowIndex][colIndex] = GitDbFormula.performVariableSubstitutions(cell, baseVariables);
                } else {
                    result[rowIndex][colIndex] = cell;
                }
            });
        });
        return result;
    }

    // public static calculateData(): string[][] {

    // }
}
