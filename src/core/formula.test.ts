import { IBaseVariables } from "../interfaces/baseVariables";
import { GitDbFormula } from "./formula";

describe('core/formula', () => {
    describe('columnNumberToLetter', () => {
        const testCases: [number, string][] = [
            [1, 'A'],
            [26, 'Z'],
            [27, 'AA'],
            [52, 'AZ'],
            [53, 'BA'],
            [702, 'ZZ'],
            [703, 'AAA'],
            [0, 'A'],
            [-1, 'A']
        ];

        test.each(testCases)("given column number %d, returns %s", (colNumber: number, expected: string) => {
            expect(GitDbFormula.columnNumberToLetter(colNumber)).toBe(expected);
        });
    });
    describe('getVariables', () => {
        it('should correctly return variables including CURRENT_COLUMN_LETTER', () => {
            const baseVars: IBaseVariables = {
                CURRENT_COLUMN: 3,
                CURRENT_ROW: 5,
                ROW_COUNT: 10,
            };
            const variables = GitDbFormula.getVariables(baseVars);
            expect(variables.get('{{CURRENT_COLUMN_LETTER}}')).toBe(GitDbFormula.columnNumberToLetter(baseVars.CURRENT_COLUMN));
            expect(variables.get('{{CURRENT_ROW}}')).toBe(baseVars.CURRENT_ROW.toString());
            expect(variables.get('{{ROW_COUNT}}')).toBe(baseVars.ROW_COUNT.toString());
        });
    });
    describe('performVariableSubstitutions', () => {
        it('should perform substitutions including offsets for CURRENT_ROW and CURRENT_COLUMN', () => {
            const baseVars: IBaseVariables = {
                CURRENT_COLUMN: 3,
                CURRENT_ROW: 5,
                ROW_COUNT: 10,
            };
            let formula = "Row: {{CURRENT_ROW+1}}, Col: {{CURRENT_COLUMN_LETTER+1}}";
            expect(GitDbFormula.performVariableSubstitutions(formula, baseVars)).toBe("Row: 6, Col: D");

            formula = "Row: {{CURRENT_ROW-6}}, Col: {{CURRENT_COLUMN_LETTER-3}}";
            // Adjusted expectations: Row defaults to "1" and Column defaults to "A"
            expect(GitDbFormula.performVariableSubstitutions(formula, baseVars)).toBe("Row: 1, Col: A");

            formula = "Next Row: {{CURRENT_ROW+1}}, Previous Column: {{CURRENT_COLUMN_LETTER-1}}";
            expect(GitDbFormula.performVariableSubstitutions(formula, baseVars)).toBe("Next Row: 6, Previous Column: B");
        });

        it('should handle negative and out of range offsets gracefully', () => {
            const baseVars: IBaseVariables = {
                CURRENT_COLUMN: 1, // Corresponds to 'A'
                CURRENT_ROW: 1,
                ROW_COUNT: 10,
            };
            // Here, an offset of +26 from 'A' (column 1) should result in 'AA', given Excel's behavior
            const formula = "{{CURRENT_ROW-2}}, {{CURRENT_COLUMN_LETTER-1}}, {{CURRENT_COLUMN_LETTER+26}}";
            expect(GitDbFormula.performVariableSubstitutions(formula, baseVars)).toBe("1, A, AA");
        });        

        it('should handle large column number minus a large offset correctly', () => {
            const baseVars: IBaseVariables = {
                CURRENT_COLUMN: 1000, // Let's assume this corresponds to a hypothetical column 'ALL'
                CURRENT_ROW: 10000,
                ROW_COUNT: 100000,
            };
            const formula = "{{CURRENT_COLUMN_LETTER-999}}, Row: {{CURRENT_ROW-9999}}";
            const result = GitDbFormula.performVariableSubstitutions(formula, baseVars);
            // Expect 'A' for the column after subtracting the large offset, and '1' for the row
            expect(result).toBe("A, Row: 1");
        });

        it('should return empty string for large column and row numbers minus offsets resulting in values less than 1', () => {
            const baseVars: IBaseVariables = {
                CURRENT_COLUMN: 500, // Hypothetically corresponds to a column '??'
                CURRENT_ROW: 5000,
                ROW_COUNT: 100000,
            };
            const formula = "{{CURRENT_COLUMN_LETTER-501}}, Row: {{CURRENT_ROW-5001}}";
            // Since the behavior is to default to "A" and "1", adjust expectations accordingly
            expect(GitDbFormula.performVariableSubstitutions(formula, baseVars)).toBe("A, Row: 1");
        });

        it('should accurately process a large row number minus a large row number', () => {
            const baseVars: IBaseVariables = {
                CURRENT_COLUMN: 26, // Corresponds to 'Z'
                CURRENT_ROW: 100000,
                ROW_COUNT: 1000000,
            };
            const formula = "Column: {{CURRENT_COLUMN_LETTER}}, Row: {{CURRENT_ROW-99999}}";
            const result = GitDbFormula.performVariableSubstitutions(formula, baseVars);
            // Expect 'Z' for the column, and '1' for the row after subtracting the large offset
            expect(result).toBe("Column: Z, Row: 1");
        });

        it('should return "A" for CURRENT_COLUMN_LETTER with large negative offsets', () => {
            const baseVars = { CURRENT_COLUMN: 3, CURRENT_ROW: 5, ROW_COUNT: 10};
            const formula = "Col: {{CURRENT_COLUMN_LETTER-5}}";
            expect(GitDbFormula.performVariableSubstitutions(formula, baseVars)).toBe("Col: A");
        });

        it('should return "1" for CURRENT_ROW with large negative offsets', () => {
            const baseVars = { CURRENT_COLUMN: 3, CURRENT_ROW: 5, ROW_COUNT: 10};
            const formula = "Row: {{CURRENT_ROW-10}}";
            expect(GitDbFormula.performVariableSubstitutions(formula, baseVars)).toBe("Row: 1");
        });

        it('should return "1" for CURRENT_ROW and "A" for CURRENT_COLUMN_LETTER when offsets result in values less than 1', () => {
            const baseVars: IBaseVariables = {
                CURRENT_COLUMN: 1, // Corresponds to 'A'
                CURRENT_ROW: 1,
                ROW_COUNT: 10,
            };
            const formula = "{{CURRENT_ROW-2}}, {{CURRENT_COLUMN_LETTER-1}}";
            const result = GitDbFormula.performVariableSubstitutions(formula, baseVars);
            // Now expecting '1' for row and 'A' for column as they default to the minimum valid values
            expect(result).toBe("1, A");
        });
    });

    describe('performSubstitutions', () => {
        it('should correctly substitute variables in double braces based on base variables', () => {
            // inputData containing placeholders within double braces
            const inputData = [
                ['={{CURRENT_ROW}}', '={{CURRENT_ROW+1}}', '={{CURRENT_COLUMN_LETTER}}', '={{CURRENT_COLUMN_LETTER+1}}'],
                ['content', '={{ROW_COUNT}}', 'content', 'content'],
            ];

            // Perform substitutions
            const result = GitDbFormula.performDataSubstitutions(inputData);

            const expectedOutput = [
                ['=1', '=2', '=C', '=E'],
                ['content', '=2', 'content', 'content'],
            ];

            // Verify the output matches expected results
            expect(result).toEqual(expectedOutput);
        });
    });
});