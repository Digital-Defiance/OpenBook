# node-gitdb

Node-GitDB is an experimental filesystem/database that intends to provide NOSQL-like functionality in a semi human-readable format.

It includes support for encryption of some fields, and is designed to be Markdown friendly, although users do need to be careful about the format of their data.

## Rationale

As a non-profit, most of what Digital Defiance does needs to be public. Node-GitDB is a way to store data in a way that is version controlled, human-readable,
and whose records can also be managed and added to by humans.

Node-GitDB seeks to be a way for similar organizations to manage their membership records and other data.

## Mechanism of action

I think the plan is to index a given commit's changed files into MongoDB which will track the filesystem state and help spot differences. Perhaps a git client hook could build the indexes and commit them with the data. I am wondering about mirroring the data into Mongo.

## Format

Largely GitHub Flavored Markdown (GFM)

Node-GitDB will parse the markdown and respond to queries in a way that is similar to a database. Most of the functionality will be in querying and parsing the data.

See [Record Format](docs/Record%20Format.md) for more information on the format.

## Directory Structure

Directory structure is critical to the functionality of Node-GitDB. The directory structure is as follows:

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

Conflicts in subrecords go to the directory structure first if such a case arises.

## Queries

Queries will be done with JSON via REST in a manner reminiscent of MongoDB. Queries will specify the expected formatting of the data and any casting, which will keep that clutter out of the data.

### Basic Structure

Queries in Node-GitDB are expressed as JSON objects, similar to MongoDB. 

A basic query structure is as follows:

```json
{
    "path": "Table.Record.Subrecord",
    "filter": {},
    "cast": {}
}
```

The three main components are `path`, `filter`, and `cast`.

- `path`: The path to the data you are querying. Paths are dot-delimited strings that specify the route to the desired data following the directory structure of Node-GitDB.
- `filter`: This is an optional JSON object that can be used to further filter the data retrieved by the query.
- `cast`: This optional field specifies the data type to which the results should be cast.


See [Querying.md](docs/Querying.md) for more information on queries.

## TODO
* Support querying of basic markdown data
* Support storing basic markdown data through query
* Support encryption of data
* Support Git WebHooks to notify Node-GitDB of changes
