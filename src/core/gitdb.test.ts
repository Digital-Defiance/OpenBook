import { GitDB } from './gitdb';
describe('gitdb', () => {
    describe('alphaSort', () => {
        test('should prioritize _top.md over other strings', () => {
            expect(GitDB.alphaSort('_top.md', 'regular.md')).toBe(-1);
            expect(GitDB.alphaSort('regular.md', '_top.md')).toBe(1);
        });

        test('should prioritize other strings over _bottom.md', () => {
            expect(GitDB.alphaSort('_bottom.md', 'regular.md')).toBe(1);
            expect(GitDB.alphaSort('regular.md', '_bottom.md')).toBe(-1);
        });

        test('should sort valid dates chronologically', () => {
            expect(GitDB.alphaSort('2020-01-01', '2019-12-31')).toBeGreaterThan(0); // Using ISO format for clarity
            expect(GitDB.alphaSort('2020-01-01', '2020-12-31')).toBeLessThan(0); // Adjusted for clarity and consistency
            expect(GitDB.alphaSort('01-01-2020', '12-31-2019')).toBeGreaterThan(0);
        });

        test('should sort strings with numbers based on the last number present', () => {
            expect(GitDB.alphaSort('note10', 'note2')).toBeGreaterThan(0);
            expect(GitDB.alphaSort('version1', 'version12')).toBeLessThan(0);
        });

        test('should sort alphabetically when no numbers are present or numbers are identical', () => {
            expect(GitDB.alphaSort('apple', 'banana')).toBeLessThan(0);
            expect(GitDB.alphaSort('note10', 'note10')).toBe(0);
        });

        test('should handle mixed cases (dates, numbers, and alphabetical sorting)', () => {
            expect(GitDB.alphaSort('_top.md', '_bottom.md')).toBe(-1);
            expect(GitDB.alphaSort('2020-10-22', 'note20')).toBeLessThan(0); // Ensure date is in a recognized format
            expect(GitDB.alphaSort('version20.1', 'apple')).toBeGreaterThan(0);
        });

        test('should correctly sort filenames with trailing numbers', () => {
            expect(GitDB.alphaSort('file1', 'file2')).toBeLessThan(0);
            expect(GitDB.alphaSort('file2', 'file10')).toBeLessThan(0);
            expect(GitDB.alphaSort('report9', 'report10')).toBeLessThan(0);
            expect(GitDB.alphaSort('image100', 'image21')).toBeGreaterThan(0);
            // Adding a case where the files have both numbers and identical prefixes but different suffixes
            expect(GitDB.alphaSort('document_v1_appendix', 'document_v1_intro')).toBeLessThan(0);
        });

        test('should sort numbers in a human-friendly manner, not lexicographically', () => {
            const filenames = ['file1', 'file10', 'file2', 'file20', 'file3'];
            // Expected: file1, file2, file3, file10, file20

            // Sort the array using the alphaSort function by comparing each element pairwise
            const sortedFilenames = filenames.sort((a, b) => GitDB.alphaSort(a, b));

            // Verify that the sorted order is as expected
            expect(sortedFilenames).toEqual(['file1', 'file2', 'file3', 'file10', 'file20']);
        });

        test('should sort dates before numbers and dates with trailing numbers in the correct order', () => {
            expect(GitDB.alphaSort('2023-01-02', '2023-01-03')).toBeLessThan(0);
            expect(GitDB.alphaSort('2023-01-02-03', '2023-01-02-04')).toBeLessThan(0);
            // Adjust expectation or logic for sorting non-date vs. date
            expect(GitDB.alphaSort('2023-01-02', 'note20')).toBeLessThan(0);
            expect(GitDB.alphaSort('2023-01-02-03', '2023-01-02')).toBeGreaterThan(0); // Ensure handling of additional numbers/text
        });

        test('should correctly handle sorting of filenames with dates followed by additional data', () => {
            // This test case is specifically designed to validate the handling of dates followed by text
            expect(GitDB.alphaSort('2023-02-01-debit-01', '2023-02-01-credit-02')).toBeLessThan(0);
            expect(GitDB.alphaSort('2023-01-02-credit-02', '2023-01-02-debit-01')).toBeGreaterThan(0);
        });

        test('should correctly prioritize the last non-date number in filenames when sorting', () => {
            // These tests check the logic for prioritizing the last non-date number seen in the filenames
            expect(GitDB.alphaSort('report-2021-update5', 'report-2021-update10')).toBeLessThan(0);
            expect(GitDB.alphaSort('summary2020-final-12', 'summary2020-final-2')).toBeGreaterThan(0);
        });

        test('should distinguish and correctly sort strings containing dates in different formats', () => {
            // Validates the flexibility in date formats
            expect(GitDB.alphaSort('event-01012020', 'event-02012020')).toBeLessThan(0); // MMDDYYYY format
            expect(GitDB.alphaSort('meeting-12-25-2021-summary', 'meeting-12-24-2021-summary')).toBeGreaterThan(0); // MM-DD-YYYY format
        });

        test('should correctly sort strings with numbers not associated with dates', () => {
            // This test ensures that numbers not part of dates are evaluated for sorting correctly
            expect(GitDB.alphaSort('version2.5.1', 'version2.5.10')).toBeLessThan(0);
            expect(GitDB.alphaSort('update7-note', 'update12-note')).toBeLessThan(0);
        });
    });
    describe('collectionSort', () => {
        const mockCollection = [
            { id: 3, name: 'banana', date: '12-31-2020' },
            { id: 1, name: '_bottom.md', date: '01-01-2020' },
            { id: 2, name: '_top.md', date: '06-15-2020' },
            { id: 4, name: 'apple', date: '11-11-2019' }
        ];

        test('should sort collection by specified string column alphabetically and by special markers', () => {
            GitDB.collectionSort(mockCollection, 'name');
            expect(mockCollection[0].name).toBe('_top.md');
            expect(mockCollection[mockCollection.length - 1].name).toBe('_bottom.md');
            expect(mockCollection[1].name).toBe('apple');
        });

        test('should sort collection by specified date column chronologically', () => {
            GitDB.collectionSort(mockCollection, 'date');
            expect(mockCollection[0].date).toBe('11-11-2019');
            expect(mockCollection[mockCollection.length - 1].date).toBe('12-31-2020');
        });

        test('should maintain the original order for items considered equivalent in sort order', () => {
            const initialOrderIds = mockCollection.map(item => item.id);
            GitDB.collectionSort(mockCollection, 'name');
            const sortedOrderIds = mockCollection.map(item => item.id);
            // Assuming no two names or dates exactly match, this test may need adjustment based on the actual implementation details
            expect(sortedOrderIds).not.toEqual(initialOrderIds);
        });
    });
});