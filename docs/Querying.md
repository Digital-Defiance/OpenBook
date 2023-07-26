# Query Language Documentation

## Introduction

Node-GitDB uses a JSON-based query language to interact with its data. Its query syntax is designed to be intuitive and easy to understand, allowing users to retrieve, filter, and manipulate data with ease. This document outlines the basic structure and functionalities of the Node-GitDB query language.

## Basic Structure

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

## Querying Data

You can retrieve data by specifying the `path`. Here is an example of a query that retrieves data:

```json
{
    "path": "Users.JohnDoe.Profile"
}
```

This query will return the `Profile` subrecord of `JohnDoe` in `Users`.

## Filtering Data

The `filter` field allows you to specify conditions that the data must meet. Filters are expressed as a JSON object where the keys are the field names and the values are the conditions that the data must meet.

For example, to get all records in a table where the key 'Age' is greater than 30, you might use a filter like this:

```json
{
    "path": "Users",
    "filter": {
        "Age": {"$gt": 30}
    }
}
```

The `$gt` is an operator meaning "greater than". Other supported operators include `$lt` (less than), `$eq` (equal), `$ne` (not equal), `$gte` (greater than or equal), and `$lte` (less than or equal).

## Casting Data

The `cast` field is used to specify the expected format of the returned data. This is useful when the data in Node-GitDB is stored in one format but needs to be used in a different format.

```json
{
    "path": "Users.JohnDoe.Age",
    "cast": "integer"
}
```

In this example, even if `Age` is stored as a string in Node-GitDB, it will be returned as an integer.

Please note that cast operations are performed after any filtering, so the filters need to be written with the original data types in mind.

## Error Handling

When an error occurs, Node-GitDB will return a JSON object with an `error` field describing the issue:

```json
{
    "error": "Path 'Users.UnknownUser' does not exist."
}
```

If a filter references a non-existent field or an invalid operator, Node-GitDB will also return an error.

Please note that Node-GitDB will not return an error if a query returns no results, it will simply return an empty dataset.

For more information on error handling, please refer to the Error Handling section of the Node-GitDB documentation.

## Conclusion

This document covers the basic structure and functionality of the Node-GitDB query language. With this guide, you should be able to construct and execute basic queries to interact with your data. For more complex operations, please refer to the Advanced Querying section of the Node-GitDB documentation.