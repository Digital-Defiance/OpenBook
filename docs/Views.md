# Views

See also: [Views](API.md#Views) from the API documentation.

Views are a feature where you can create a view.json in a table folder which contains an object containing path => column name pairs.

The left hand side corresponds to the flattened nodes in the filenodes collection, the right hand side is the column name to store the value under.

If the node is a checkbox or a checked list item, the value will be 'true' or 'false'.

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

There are several view [endpoints](API.md#Views).
