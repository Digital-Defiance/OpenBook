# API

Postman 2.1 schema: [node-gitdb/Node-GitDB.postman_collection.json](https://github.com/Digital-Defiance/node-gitdb/blob/main/Node-GitDB.postman_collection.json)

## Tables

### GET /tables

​	the /tables endpoint returns the table names directly off the disk, not using the mongo index
​	these are relative to the mountpoint/path options of the GitDB, they may or may not contain records

```json
[
    "Chapters",
    "Donations",
    "Expenses",
    "Members",
    "Projects"
]
```

### GET /tables/:table

​	i.e. GET /tables/Members

```json
[
    "BDisp.md",
    "Brian G.md",
    "Charles Shisler.md",
    "Hannah Mulein.md",
    "Jessica Mulein.md",
    "Jon.md",
    "Joseph Arceneaux.md",
    "Rui Campos.md",
    "Vijayee.md",
    "template.md"
]
```

​	the /tables/:table endpoint returns the file names directly off the disk, not using the mongo index

### GET /tables/:table/data

​	gets an array of the root nodes for all of the files in the table

```json
[
    {
        "type": "root",
        "children": [
        ...
        ],
        "position": {
            "start": {
                "line": 1,
                "column": 1,
                "offset": 0
            },
            "end": {
                "line": 9,
                "column": 1,
                "offset": 283
            }
        }
    }
]
```

### GET /tables/:table_name/files/:file_name

​	returns the available formats for the given table/file

```json
[
    "markdown",
    "html",
    "json"
]
```

### GET /tables/:table_name/files/:file_name/json

​	returns the JSON format of the requested file

```json
{
    "type": "root",
    "children": [
    ...
    ],
    "position": {
        "start": {
            "line": 1,
            "column": 1,
            "offset": 0
        },
        "end": {
            "line": 14,
            "column": 1,
            "offset": 472
        }
    }
}
```

### GET /tables/:table_name/files/:file_name/html

​	returns the HTML format of the requested file

```html
<h1>Donation</h1>
<p><strong>Name:</strong> Donation to cover Charitable Organization Registration
	<strong>Involved Party:</strong> Jessica Mulein
	<strong>Date:</strong> 2023-02-20
	<strong>Description:</strong> Donation to cover Charitable Organization Registration
	<strong>Quantity:</strong> 1
	<strong>Item Amount:</strong> $60.00
	<strong>Total:</strong> $60.00
	<strong>Balance:</strong> $60.00
	<strong>Category:</strong> Non Profit Income:Cash Donations
	<strong>Memo:</strong> State of Washington Corporations &#x26; Charities Division. Charitable Organization
	Registration.
	<strong>Reference Number:</strong> 2023022000136199</p>
```

### GET /tables/:table_name/files/:file_name/markdown

​	returns the Markdown format of the requested file

```markdown
# Donation

**Name:** Donation to cover Charitable Organization Registration
**Involved Party:** Jessica Mulein
**Date:** 2023-02-20
**Description:** Donation to cover Charitable Organization Registration
**Quantity:** 1
**Item Amount:** $60.00
**Total:** $60.00
**Balance:** $60.00
**Category:** Non Profit Income:Cash Donations
**Memo:** State of Washington Corporations & Charities Division. Charitable Organization Registration.
**Reference Number:** 2023022000136199

```

### GET /tables/:table_name/paths

​	Gets all of the distinct path names available for the table from the flattened filenodes collection

```json
[
    "root.0.heading.0.text",
    "root.1.paragraph.1.text",
    "root.1.paragraph.3.text",
    "root.1.paragraph.5.text",
    "root.1.paragraph.7.text",
    "root.1.paragraph.9.text",
    "root.1.paragraph.11.text",
    "root.1.paragraph.13.text",
    "root.1.paragraph.16.link.0.text",
    "root.1.paragraph.20.link.0.text",
    "root.1.paragraph.23.text",
    "root.1.paragraph.25.text",
    "root.3.list.0.listItem",
    "root.3.list.1.listItem",
    "root.3.list.2.listItem",
    "root.3.list.3.listItem",
    "root.3.list.4.listItem",
    "root.3.list.5.listItem",
    "root.3.list.6.listItem",
    "root.3.list.7.listItem",
    "root.3.list.8.listItem",
    "root.4.paragraph.1.text",
    "root.4.paragraph.3.text"
]
```

### GET /tables/:table_name/paths/:path

​	Gets the associated columns for the given table path for all records in the table

```json
[
    ...
    {
        "file": "Jessica Mulein.md",
        "value": "Jessica Mulein"
    },
    ...
]
```



## Views

### GET /view/:table_name

​	Gets the associated view data for the given table, if a view.json exists for the table.
​	Response format is an object keyed by filename and then the path => column name from the view.json is keyed as column_name => value. Checkboxes return true or false. Data is whitespace trimmed.

```json
{
    ...
    "Jessica Mulein.md": {
        "Name": "Jessica Mulein",
        "Role": "President",
        "Good Standing": "Yes",
        "Email Alias": "jessica",
        "GitHub URL": "https://github.com/JessicaMulein/JessicaMulein",
        "LinkedIn URL": "https://www.linkedin.com/in/jessicamulein/",
        "Location": "United States, Washington",
        "Timezone": "GMT-7/-8 Pacific Time",
        "Member Type": "Board Member",
        "Join Date": "2022-01-01",
        "Join Letter": "not filed yet, grandfathered",
        "Date of last YAS": "not filed yet, not due",
        "M365": "true",
        "1Password": "true",
        "Duo": "true",
        "GitHub": "true",
        "Website": "true",
        "Discord": "true",
        "Atlassian": "true",
        "QuickBooks": "true",
        "DonorPerfect": "true",
        "Challenge Coins": "3",
        "Coins Requested, Unshipped": "0"
    },
    ...
}
```

### GET /view/:table_name/paths

​	Returns an array of the string paths used in the table's view.json

```json
[
    "root.0.heading.0.text",
    "root.1.paragraph.1.text",
    "root.1.paragraph.3.text",
    "root.1.paragraph.5.text",
    "root.1.paragraph.7.text",
    "root.1.paragraph.9.text",
    "root.1.paragraph.11.text",
    "root.1.paragraph.13.text",
    "root.1.paragraph.16.link.0.text",
    "root.1.paragraph.20.link.0.text",
    "root.1.paragraph.23.text",
    "root.1.paragraph.25.text",
    "root.3.list.0.listItem",
    "root.3.list.1.listItem",
    "root.3.list.2.listItem",
    "root.3.list.3.listItem",
    "root.3.list.4.listItem",
    "root.3.list.5.listItem",
    "root.3.list.6.listItem",
    "root.3.list.7.listItem",
    "root.3.list.8.listItem",
    "root.4.paragraph.1.text",
    "root.4.paragraph.3.text"
]
```

### GET /view/:table_name/condensed

​	Gets the associated view data as an array of string columns, starting with a header row. Designed to be easily imported into Excel.

```
[
    [
        "Name",
        "Role",
        "Member Type",
        "Join Date",
        "Join Letter",
        "Date of last YAS",
        "Good Standing",
        "Email Alias",
        "GitHub URL",
        "LinkedIn URL",
        "Location",
        "Timezone",
        "M365",
        "1Password",
        "Duo",
        "GitHub",
        "Website",
        "Discord",
        "Atlassian",
        "QuickBooks",
        "DonorPerfect",
        "Challenge Coins",
        "Coins Requested, Unshipped"
    ],
    ...
    [
        "Jessica Mulein",
        "President",
        "Board Member",
        "2022-01-01",
        "not filed yet, grandfathered",
        "not filed yet, not due",
        "Yes",
        "jessica",
        "https://github.com/JessicaMulein/JessicaMulein",
        "https://www.linkedin.com/in/jessicamulein/",
        "United States, Washington",
        "GMT-7/-8 Pacific Time",
        "true",
        "true",
        "true",
        "true",
        "true",
        "true",
        "true",
        "true",
        "true",
        "3",
        "0"
    ],
    ...
]
```

### GET /view/:table_name/excel

​	Gets the [condensed](API.md#get-viewtable_namecondensed) view as an excel spreadsheet in xlsx format.

<img width="1248" alt="image" src="https://github.com/Digital-Defiance/node-gitdb/assets/3766240/601e0745-4963-40fb-8a1f-59088d7d6bb5">
