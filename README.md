# node-gitdb

Note: Node-GitDB is in pre-alpha, and is not only incomplete and undergoing development, but also should not be trusted with data.

-----

Node-GitDB is an experimental git versioned markdown filesystem to mongo orchestrator. Rather than re-inventing the wheel, we opted to use MongoDB to store the data, and this service uses git to determine updates needed for the mongodb. This little service can currently be run on a cron or manually to sync up the data. In the future it will support webhooks to automatically update the data.

It is intended to take data from a human readable repository in markdown format (maximum, single folder level depth) in a mostly human-readable format. It is not designed for huge databases- is intended for relatively small (hundreds or thousands of records) databases, such as member lists, or other small datasets. It is limited by the filesystem, its speed, and the additional overhead of git and parsing markdown.

It is designed to be Markdown friendly, although users do need to be careful about the format of their data.

## Rationale

As a non-profit, most of what Digital Defiance does needs to be public. Node-GitDB is a way to store data in a way that is version controlled, human-readable,
and whose records can also be managed and added to by humans. Examples would include member lists and possibly financial transactions.

Node-GitDB seeks to be a way for similar organizations to manage their membership records and other data.

## Mechanism of action

We will utilize git status and git diff to determine changes and we will store all the parsed markdown in the database respository under a separate repo so that its hashes are managed separately. We will use 'remark' and 'remark-gfm' to parse the markdown at index time, and produce a collection of parsed markdown files, ready to query. This map will constitute the 'database'. We will then insert/upsert all the documents into mongo for easy querying. The mongo is continually refreshed by the git repository, and at the moment this is mostly a wipe and reinsert process, but in the future we will be smarter.

## Format

Largely GitHub Flavored Markdown (GFM)

Node-GitDB will parse the markdown and respond to queries in a way that is similar to a database. Most of the functionality will be in querying and parsing the data.

See [Record Format](docs/Record%20Format.md) for more information on the format.

## Directory Structure

Directory structure is critical to the functionality of Node-GitDB. 
Each table is housed within its own directory, and each record is a markdown file within that directory.
Tables/directories can not be nested at this time.
Further nesting is achieved within the markdown itself.

See [Directory Structure](docs/Directory%20Structure.md) for more information on the directory structure.

## Queries

Queries will be done with JSON via REST in a manner reminiscent of MongoDB. Queries will specify the expected formatting of the data and any casting, which will keep that clutter out of the data.

See [Querying](docs/Querying.md) for more information on querying.

### Setup

- Create or locate an existing git repository containing your data. It must be formatted and placed as above in order to be parsed correctly.
- If the repository is to start empty, you must manually create an initial commit that is empty or has a .dotfile in it. 

Copy .env.example to .env and fill in the values.
There are options to locate the date at a subdirectory within each of the repositories.

## Complete
* Basic git cloning of data and index repositories
* Basic indexing into a collection of remark Node objects

## In Progress
* Support inserting the index data into mongo

## TODO
* Support querying of basic markdown data through mongo
* Support querying/updating through REST API
* Support storing basic markdown data through query
* Support encryption of data
* Support Git WebHooks to notify Node-GitDB of changes
