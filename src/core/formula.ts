import { ConfigParams, HyperFormula } from "hyperformula";
import { IBaseVariables } from '../interfaces/baseVariables';
import { FormattedFormula } from '../interfaces/formattedFormula';

export abstract class GitDBFormula {
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
        variables.set(`{{CURRENT_COLUMN_LETTER}}`, GitDBFormula.columnNumberToLetter(baseVars['CURRENT_COLUMN']));

        return variables;
    }

    /**
     * Given a formula and a set of base variables, perform substitutions and return the resulting formula.
     * @param formula The formula to perform substitutions on
     * @param baseVars The base variables to use
     * @returns The formula with substitutions performed
     */
    public static performVariableSubstitutionsOnFormula(formula: string, baseVars: IBaseVariables): string {
        // replace dynamic variables
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
            return GitDBFormula.columnNumberToLetter(newColumnNumber);
        });

        formula = formula.replace(/\{\{ROW_COUNT([+-]\d+)?\}\}/g, (match, offset) => {
            const rowCount = baseVars['ROW_COUNT'];
            return (rowCount + (offset ? parseInt(offset, 10) : 0)).toString();
        });

        // replace basic variables
        const variables = GitDBFormula.getVariables(baseVars);
        variables.forEach((value, key) => {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedKey, 'g');
            formula = formula.replace(regex, value);
        });

        return formula;
    }

    public static getFormulaFormatting(inputData: string[][]): string[][] {
        const result: string[][] = [];
        inputData.forEach((row, rowIndex) => {
            result[rowIndex] = [];
            row.forEach((cell, colIndex) => {
                let cellData = '';
                if (cell.startsWith('!&&')) {
                    const cellFormatResult = GitDBFormula.extractFormattingFromFormula(cell);
                    cellData = cellFormatResult.formatting ?? '';
                }
                result[rowIndex][colIndex] = cellData;
            });
        });
        return result;
    }

    /**
     * Perform variable substitutions on the input data and return the result.
     * @param inputData The input data to perform substitutions on
     * @returns The input data with substitutions performed
     */
    public static performDataSubstitutions(inputData: string[][]): string[][] {
        const result: string[][] = [];
        // for each cell (row+col) in the input data, create a new IBaseVariables object and perform substitutions
        inputData.forEach((row, rowIndex) => {
            result[rowIndex] = [];
            row.forEach((cell, colIndex) => {
                let cellData = cell;
                if (cellData.startsWith('!&&')) {
                    const cellFormatResult = GitDBFormula.extractFormattingFromFormula(cellData);
                    cellData = cellFormatResult.formula;
                }
                if (cellData.startsWith('=')) {
                    const baseVariables: IBaseVariables = {
                        CURRENT_COLUMN: colIndex + 1,
                        CURRENT_ROW: rowIndex + 1,
                        ROW_COUNT: inputData.length,
                    };
                    result[rowIndex][colIndex] = GitDBFormula.performVariableSubstitutionsOnFormula(cellData, baseVariables);
                } else {
                    result[rowIndex][colIndex] = cellData;
                }
            });
        });
        return result;
    }

    /**
     * Calculate all formulas in the input data and return the result.
     * @param inputData 
     * @returns 
     */
    public static calculateDataFormulas(inputData: string[][], options?: Partial<ConfigParams>): string[][] {
        const result: string[][] = [];
        const hf = HyperFormula.buildFromArray(inputData, options);
        inputData.forEach((row, rowIndex) => {
            result[rowIndex] = [];
            row.forEach((cell, colIndex) => {
                if (cell.startsWith('=')) {
                    console.log('Calculating formula', cell, 'at', rowIndex, colIndex);
                    try {
                        const calculatedValue = hf.getCellValue({ sheet: 0, row: rowIndex, col: colIndex });
                        result[rowIndex][colIndex] = calculatedValue?.toString() ?? '';
                    } catch (error) {
                        console.log('Error calculating formula', cell, 'at', rowIndex, colIndex, error);
                        result[rowIndex][colIndex] = '#ERROR';
                    }
                } else {
                    result[rowIndex][colIndex] = cell;
                }
            });
        });

        return result;
    }

    /**
     * Given a formula with our custom formatting syntax, extract the formula and formatting and return them.
     * Syntax: !&&{formatting}&&{cell data}
     * eg !&&"$"#,##0.00&&=A1
     * @param formula The formula to extract formatting from
     */
    public static extractFormattingFromFormula(formula: string): FormattedFormula {
        const matches = formula.match(/^!&&(.+?)&&(.+)$/);
        if (matches && matches.length === 3) {
            return { formula: matches[2], formatting: matches[1] };
        }
        return { formula };
    }
}
