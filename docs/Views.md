# Views

See also: [Views](API.md#Views) from the API documentation.

Views are a feature where you can create a view.json in a table folder which contains an object containing path => column name pairs.

The left hand side corresponds to the flattened nodes in the filenodes collection, the right hand side is the column name to store the value under.

If the node is a checkbox or a checked list item, the value will be 'true' or 'false'.

Example view.json from the Digital Defiance 2023 Cash Flow table.

```json
{
    "root.0.heading.0.text": "Type",
    "root.1.paragraph.1.text": "Name",
    "root.1.paragraph.3.text": "Involved Party",
    "root.1.paragraph.5.text": "Date",
    "root.1.paragraph.7.text": "Description",
    "root.1.paragraph.9.text": "Quantity",
    "root.1.paragraph.11.text": "Item Amount",
    "root.1.paragraph.13.text": "Total",
    "root.1.paragraph.15.text": "Balance",
    "root.1.paragraph.17.text": "Category",
    "root.1.paragraph.19.text": "Memo",
    "root.1.paragraph.21.text": "Reference Number"
}
```

In the above example, we have an object where the left hand side properties are the path names seen in the filenodes collection generated during second stage indexing for data files (excludes *.template.md/template.md files)

## Endpoints

There are several view [endpoints](API.md#Views).

### GET /view/:table_name

​	Gets the associated view data for the given table, if a view.json exists for the table.
​	Response format is an object keyed by filename and then the path => column name from the view.json is keyed as column_name => value. Checkboxes return true or false. Data is whitespace trimmed.

### GET /view/:table_name/paths

​	Returns an array of the string paths used in the table's view.json

### GET /view/:table_name/condensed

​	Gets the associated view data as an array of string columns, starting with a header row. Designed to be easily imported into Excel.

## Example 1: Digital Defiance Members

For this view JSON used by the Digital Defiance Members table.

```json
{
    "root.0.heading.0.text": "Name",
    "root.1.paragraph.1.text": "Role",
    "root.1.paragraph.3.text": "Member Type",
    "root.1.paragraph.5.text": "Join Date",
    "root.1.paragraph.7.text": "Join Letter",
    "root.1.paragraph.9.text": "Date of last YAS",
    "root.1.paragraph.11.text": "Good Standing",
    "root.1.paragraph.13.text": "Email Alias",
    "root.1.paragraph.16.link.0.text": "GitHub URL",
    "root.1.paragraph.20.link.0.text": "LinkedIn URL",
    "root.1.paragraph.23.text": "Location",
    "root.1.paragraph.25.text": "Timezone",
    "root.3.list.0.listItem": "M365",
    "root.3.list.1.listItem": "1Password",
    "root.3.list.2.listItem": "Duo",
    "root.3.list.3.listItem": "GitHub",
    "root.3.list.4.listItem": "Website",
    "root.3.list.5.listItem": "Discord",
    "root.3.list.6.listItem": "Atlassian",
    "root.3.list.7.listItem": "QuickBooks",
    "root.3.list.8.listItem": "DonorPerfect",
    "root.4.paragraph.1.text": "Challenge Coins",
    "root.4.paragraph.3.text": "Coins Requested, Unshipped"
}
```

For example the above, when used on a template like this:
```markdown
# {User}

**Role:** {Role}
**Member Type:** {Member Type}
**Join Date:** {YYYY-MM-DD}
**Join Letter:** {YYYY-MM-DD}
**Date of Last YAS:** {YYYY-MM-DD}
**Good Standing:** {Yes/No}
**Email Alias:** {first.last/first}
**GitHub URL:** [https://github.com/X](https://github.com/X)
**LinkedIn URL:** [https://www.linkedin.com/in/X/](https://www.linkedin.com/in/X/)
**Location:** {Country}, {State/Province}
**Timezone:** GMT{Offset} {Locale eg Pacific Time}

## Administrative

- [ ] **M365**
- [ ] **1Password**
- [ ] **Duo**
- [ ] **GitHub**
- [ ] **Website**
- [ ] **Discord**
- [ ] **Atlassian**
- [ ] **QuickBooks**
- [ ] **DonorPerfect**

**Challenge Coins:** {Number}
**Coins Requested, Unshipped:** {Number}

## Personal Information, Encrypted

| Key             | Value |
| --------------- | ----- |
| Personal Email  |       |
| Emergency Phone |       |

```

We get the following JSON from the [View API endpoint](API.md#get-viewtable_name).

```
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

## Example 2: Digital Defiance 2023 Cash Flow

view.json:
```json
{
    "root.0.heading.0.text": "Type",
    "root.1.paragraph.1.text": "Name",
    "root.1.paragraph.3.text": "Involved Party",
    "root.1.paragraph.5.text": "Date",
    "root.1.paragraph.7.text": "Description",
    "root.1.paragraph.9.text": "Quantity",
    "root.1.paragraph.11.text": "Item Amount",
    "root.1.paragraph.13.text": "Total",
    "root.1.paragraph.15.text": "Balance",
    "root.1.paragraph.17.text": "Category",
    "root.1.paragraph.19.text": "Memo",
    "root.1.paragraph.21.text": "Reference Number"
}
```

example view endpoint result:
```json
{
    "20230220_credit_01.md": {
        "Type": "Donation",
        "Name": "Donation to cover Charitable Organization Registration",
        "Item Amount": "$60.00",
        "Total": "$60.00",
        "Balance": "$60.00",
        "Category": "Non Profit Income:Cash Donations",
        "Memo": "State of Washington Corporations & Charities Division. Charitable Organization Registration.",
        "Reference Number": "2023022000136199",
        "Involved Party": "Jessica Mulein",
        "Date": "2023-02-20",
        "Description": "Donation to cover Charitable Organization Registration",
        "Quantity": "1"
    },
    "20230220_debit_01.md": {
        "Type": "Expense",
        "Name": "Charitable Organization Registration",
        "Item Amount": "-$60.00",
        "Total": "-$60.00",
        "Balance": "$0.00",
        "Category": "Business Licenses and Registration",
        "Memo": "State of Washington Corporations & Charities Division. Charitable Organization Registration.",
        "Reference Number": "2023022000136199",
        "Involved Party": "State of Washington",
        "Date": "2023-02-20",
        "Description": "Charitable Organization Registration fee",
        "Quantity": "1"
    }
}
```
example excel:
<img width="1248" alt="image" src="https://github.com/Digital-Defiance/node-gitdb/assets/3766240/b025f921-eeec-41b7-9521-fd8066ade025">
