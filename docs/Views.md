# Views

See also: [Views](API.md#Views) from the API documentation.

Views are a feature where you can create a view.json in a table folder which contains an object containing path => column name pairs.

The left hand side corresponds to the flattened nodes in the filenodes collection, the right hand side is the column name to store the value under.

If the node is a checkbox or a checked list item, the value will be 'true' or 'false'.

## Example 1

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

## Example 2

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


## Endpoints
There are several view [endpoints](API.md#Views).

<img width="741" alt="image" src="https://github.com/Digital-Defiance/node-gitdb/assets/3766240/9b168dac-72cc-4506-99b1-acf58605fc52">

<img width="739" alt="image" src="https://github.com/Digital-Defiance/node-gitdb/assets/3766240/d4f6ca40-4921-4f1d-84ed-0ed16eadf3f6">

<img width="847" alt="image" src="https://github.com/Digital-Defiance/node-gitdb/assets/3766240/7804d71f-ef86-4852-bb1c-4a99e2edcae6">

<img width="654" alt="image" src="https://github.com/Digital-Defiance/node-gitdb/assets/3766240/89286f17-c812-4b22-9d27-0704e5b8b503">



