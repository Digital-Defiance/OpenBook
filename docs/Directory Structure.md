# Directory Structure

Directory structure is critical to the functionality of OpenBook.
Each table is housed within its own directory, and each record is a markdown file within that directory. See [Sorting](#Sorting).
Tables/directories can not be nested.

The directory structure is as follows:

```
- root
  - table
    - record
      - subrecord
      - subrecord
    - record
      - subrecord
      - subrecord
  - table
    - record
      - subrecord
      - subrecord
    - record
      - subrecord
      - subrecord
```

Further nesting is achieved within the markdown itself.
For example if the above markdown from the Format section was in table/record/subrecord we should be able to query `Table.Record.Subrecord.Record.Subrecord` and get the value `Value`.

## Sorting

Records are sorted according to their file names and the following rules (which attempt to allow chronological placement):

1. Special strings `'_top.md'` and `'_bottom.md'` are always placed at the top and bottom respectively. _top is placed the first row after the header and _bottom is placed as the last row.
2. If both strings contain valid dates, they are sorted chronologically.
3. If the dates are identical, the strings are then sorted based on the last number found in each string. This allows a structure like YYYY-MM-DD-credit-01.md and YYYY-MM-DD-debit-02.md.
4. If only one string has a date, it is placed before the other.
5. If neither string contains a date or if the dates are the same, the strings are compared based on the last number found in each string.
6. If the numbers are the same or if no numbers are present, the strings are sorted alphabetically.
