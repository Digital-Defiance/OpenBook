# node-gitdb

Node-GitDB is an experimental filesystem/database that intends to provide NOSQL-like functionality in a semi human-readable format. It is not designed for huge databases- is intended for relatively small (hundreds or thousands of records) databases, such as member lists, or other small datasets. It is limited by the filesystem, its speed, and the additional overhead of git and parsing markdown.

It includes support for encryption of some fields, and is designed to be Markdown friendly, although users do need to be careful about the format of their data.

## Rationale

As a non-profit, most of what Digital Defiance does needs to be public. Node-GitDB is a way to store data in a way that is version controlled, human-readable,
and whose records can also be managed and added to by humans.

Node-GitDB seeks to be a way for similar organizations to manage their membership records and other data.

## Mechanism of action

We will utilize git status and git diff to determine changes and we will store all the parsed markdown in the database respository under a separate repo so that its hashes are managed separately. We will use 'remark' and 'remark-gfm' to parse the markdown at index time, and produce a collection of parsed markdown files, ready to query. This map will constitute the 'database'.

From there we will build mongo-like mechanisms to query the data.

## Format

Largely GitHub Flavored Markdown (GFM)

Node-GitDB will parse the markdown and respond to queries in a way that is similar to a database. Most of the functionality will be in querying and parsing the data.

See [Record Format](docs/Record%20Format.md) for more information on the format.

## Directory Structure

Directory structure is critical to the functionality of Node-GitDB. 
Each table is housed within its own directory, and each record is a markdown file within that directory.
Tables/directories can not be nested.
Further nesting is achieved within the markdown itself.

See [Directory Structure](docs/Directory%20Structure.md) for more information on the directory structure.

## Queries

Queries will be done with JSON via REST in a manner reminiscent of MongoDB. Queries will specify the expected formatting of the data and any casting, which will keep that clutter out of the data.

See [Querying](docs/Querying.md) for more information on querying.

### Setup

- Create or locate an existing git repository containing your data. It must be formatted and placed as above in order to be parsed correctly.
- Create or locate an existing git repository containing your index. It must contain the index.json file.
- If the repositories are to start empty, you must manually create an initial commit that is empty or has a .dotfile in it. 
  - It should be possible, but not recommended, to have the data and index in the same repository under separate branches.
  - It is not tested to have the index and the data in the same branch.
  - If you were going to try it, it would have to be in a path with a .dotted name and add that to the .gitignore. Your mileage may vary, a lot.

Copy .env.example to .env and fill in the values.
There are options to locate the date at a subdirectory within each of the repositories.

## TODO
* Support querying of basic markdown data
* Support storing basic markdown data through query
* Support encryption of data
* Support Git WebHooks to notify Node-GitDB of changes
