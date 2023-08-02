# Example data

```markdown test.md
# test.md

## key 1

Value 1
```

The resulting JSON from the above markdown is as follows: 
```json
{
  "_id": {
    "$oid": "64c9983b0e6997d58d14ef1d"
  },
  "file": "test.md",
  "indexingVersion": "0.0.0",
  "table": "table 1",
  "__v": 0,
  "date": {
    "$date": "2023-08-01T23:41:47.281Z"
  },
  "hash": "53d2c7cd7cc628762e0a387cc71d1e9eddd9c41db161fbd29689474451d3fa3d",
  "record": {
    "type": "root",
    "children": [
      {
        "type": "heading",
        "depth": 1,
        "children": [
          {
            "type": "text",
            "value": "test.md",
            "position": {
              "start": {
                "line": 1,
                "column": 3,
                "offset": 2
              },
              "end": {
                "line": 1,
                "column": 10,
                "offset": 9
              }
            }
          }
        ],
        "position": {
          "start": {
            "line": 1,
            "column": 1,
            "offset": 0
          },
          "end": {
            "line": 1,
            "column": 10,
            "offset": 9
          }
        }
      },
      {
        "type": "heading",
        "depth": 2,
        "children": [
          {
            "type": "text",
            "value": "key 1",
            "position": {
              "start": {
                "line": 3,
                "column": 4,
                "offset": 14
              },
              "end": {
                "line": 3,
                "column": 9,
                "offset": 19
              }
            }
          }
        ],
        "position": {
          "start": {
            "line": 3,
            "column": 1,
            "offset": 11
          },
          "end": {
            "line": 3,
            "column": 9,
            "offset": 19
          }
        }
      },
      {
        "type": "paragraph",
        "children": [
          {
            "type": "text",
            "value": "Value 1",
            "position": {
              "start": {
                "line": 5,
                "column": 1,
                "offset": 21
              },
              "end": {
                "line": 5,
                "column": 8,
                "offset": 28
              }
            }
          }
        ],
        "position": {
          "start": {
            "line": 5,
            "column": 1,
            "offset": 21
          },
          "end": {
            "line": 5,
            "column": 8,
            "offset": 28
          }
        }
      }
    ],
    "position": {
      "start": {
        "line": 1,
        "column": 1,
        "offset": 0
      },
      "end": {
        "line": 6,
        "column": 1,
        "offset": 29
      }
    }
  }
}
```