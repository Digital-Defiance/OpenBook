# Record Format

Largely GitHub Flavored Markdown (GFM)

OpenBook will parse the markdown and respond to queries in a way that is similar to a database. Most of the functionality will be in querying and parsing the data.

```
# Record
## Key

Value

### Subrecord

Value

## Table Example

| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| Value 1  | Value 2  | Value 3  |

## Table Example 2

Key: Value
Key 2: Value 2

## Table Example 3

Key => Value
Key 2 => Value 2

## Bullet table/array

- Value 1
- Value 2
```
