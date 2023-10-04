# OpenBook

![OpenBook 1@4x](https://github.com/Digital-Defiance/OpenBook/assets/3766240/b09a6ddb-500c-4358-863b-2524b7b3fe44)

Note: OpenBook is in beta, is incomplete, and undergoing development. (See [#Complete](#Complete))

-----

OpenBook is an experimental git versioned markdown filesystem to mongo orchestrator. Rather than re-inventing the wheel, we opted to use MongoDB to store the data, and this is a service that uses git to determine updates needed for the mongodb. This little service can currently be run on a cron or manually to sync up the data. In the future it will support webhooks to automatically update the data.

It is intended to take data from a human readable repository in markdown format (maximum, single folder level depth) in a mostly human-readable format. It is not designed for huge databases- is intended for relatively small (hundreds or thousands of records) databases, such as member lists, or other small datasets. It is limited by the filesystem, its speed, and the additional overhead of git and parsing markdown.

It is designed to be Markdown friendly, although users do need to be careful about the format of their data. Structure is essential in being able to query into the nested structure of the document. Structure is expected to be GitHub flavored markdown. Depending on the structure of the document, some lines may need to have two spaces at the end of the line to format correctly, which is according to GFM syntax.

Internally we use [remark - npm (npmjs.com)](https://www.npmjs.com/package/remark), which used to be called mdast, to convert the markdown into tables of queryable data from mongo. We store the entire parsed root node, and we do a further stage of indexing to flatten the nodes for easier querying.

Once imported, our Node express [API](docs/API.md) performs some essential queries and functions on the mongo data. Data is easily moved between markdown, json, html, and it can also output Excel files from a feature we call [Views](docs/Views.md).

Here is an example Excel file generated from the raw markdown entries in our [https://github.com/Digital-Defiance/Digital-Defiance/tree/main/Public%20Data/2023%20Cash%20Flow](Digital-Defiance repo).
![image](https://github.com/Digital-Defiance/OpenBook/assets/3766240/a6a5a692-1584-4c4e-84d2-2e82c98e8de2)


## Rationale

As a non-profit, most of what Digital Defiance does needs to be public. OpenBook is a way to store data in a way that is version controlled, human-readable, and whose records can also be managed and added to by humans. Examples would include member lists and possibly financial transactions.

OpenBook seeks to be a way for similar organizations to manage their membership records and other data.

Digital Defiance seeks to use OpenBook to store and display data for our membership, grants, donations, and a running expense sheet to start with. A front end, likely at transparency.digitaldefiance.org, will be created to expose the data in its various forms, search and display records. 

## Mechanism of action

- We utilize git status and git diff to determine changes and we store all the parsed markdown in the database repository under a separate repo so that its hashes are managed separately. The git diff only looks for changes to '.md' files within a specified path (configurable, default: /, relative to the repository).

- There are two main stages of indexing composed of several steps:
  1. We ensure the repository is checked out and on the correct branch at the mountpoint (configurable, default: /tmp/openbook).
     - If the mountpoint is empty or doesn't exist, we make the parent directory (recursively) if necessary and clone the repository.
     - We fetch and ensure we are on the correct branch 
     - We pull the latest changes
  
  2. For the main stage of indexing, we use 'remark' and 'remark-gfm' to parse the markdown at index time, and produce an array of parsed markdown files ready to add into mongo. 
  
  3. We then upsert all the assembled documents into mongo for easy querying. This collection is called 'fileindexes'. These conform to this interface: [openbook/src/interfaces/fileIndex.ts](https://github.com/Digital-Defiance/OpenBook/blob/main/src/interfaces/fileIndex.ts)
     - Of note, there is a 'data' attribute in the fileindexes which is used to discriminate between templates and records.
  
       - A template is simply a markdown file that has the structure the data is expected to be in and is only for human reference. When a new record is to be added by a human, the template is copied and the name set to the name of the record or whatever you want to use as a sorting key as output is sorted by the template file name.
  
         Any file named 'template.md' or ending in '.template.md' will be marked as non-data and will be excluded from aggregating functions intended to query the actual data. Example: [Digital-Defiance/Public Data/Members/template.md](https://github.com/Digital-Defiance/Digital-Defiance/blob/main/Public Data/Members/template.md)
  
       - A record is any other markdown file, which will be construed as data. For instance a record in a members table would be a file containing the detail of one member. Example: [Digital-Defiance/Public Data/Members/Jessica Mulein.md](https://github.com/Digital-Defiance/Digital-Defiance/blob/main/Public Data/Members/Jessica Mulein.md)
  
  4. For documents that are not templates, also known as 'data' or 'records', they will be second stage indexed and have their parsed markdown nodes flattened out with values. These follow this interface: [openbook/src/interfaces/fileNode.ts](https://github.com/Digital-Defiance/OpenBook/blob/main/src/interfaces/fileNode.ts).
  
  5. After indexing has been performed, a node express server will start up and provide a REST API to query the data.
  
     - Documents can be requested in a variety of formats, including markdown, html, and json.
     - The feature we call [Views](docs/Views.md) has some JSON endpoints as well as an excel endpoint.
  
- TODO: At the moment, indexing is only done on startup, but in the near future, the mongo will be continually refreshed by changes to the git repository.

## Format

Largely GitHub Flavored Markdown (GFM)

OpenBook will parse the markdown and respond to queries in a way that is similar to a database. Most of the functionality will be in querying and parsing the data.

See [Record Format](docs/Record%20Format.md) for more information on the format.

## Directory Structure

Directory structure is critical to the functionality of OpenBook. 
Each table is housed within its own directory, and each record is a markdown file within that directory.
Tables/directories can not be nested at this time.
Further nesting is achieved within the markdown itself.

See [Directory Structure](docs/Directory%20Structure.md) for more information on the directory structure.

### GitDB Database Setup

- Create or locate an existing git repository containing your data. It must be formatted and placed as above in order to be parsed correctly.
- If the repository is to start empty, you must manually create an initial commit that is empty or has a .dotfile in it. 

Copy .env.example to .env and fill in the values.
There are options to locate the date at a subdirectory within each of the repositories.

## Developing/Running (Windows 11)

* [Download](https://code.visualstudio.com/download) and install Visual Studio Code if you haven't already
* [Download](https://www.docker.com/products/docker-desktop/) and install Docker Desktop if you haven't already
* Highly recommend downloading and installing [Postman](https://www.postman.com/downloads/) for testing the REST API if you haven't already installed it.
* If you don't already have a Git Bash installed by Visual Studio, [download](https://git-scm.com/downloads) and install Git Bash.
* Open Git Bash and change directory to your favorite location for source code
* ```$ git clone https://github.com/Digital-Defiance/OpenBook.git```
* Open Visual Studio Code and 'open folder' to the OpenBook directory
* Once Visual Studio Code has loaded the project it should detect the .devcontainer/devcontainer.json file and offer to reopen in the container down in the lower right. You should decline until you have copied the /.devcontainer/.env.example to /.devcontainer/.env and filled in the values you desire to be your Mongo user/password. This .env file is used by docker-compose to set up mongo with a pre-specified user and password.
  * MONGO_DB_USERNAME
  * MONGO_DB_PASSWORD
* There is another .env in OpenBook (one level under the repo root. Copy OpenBook/openbook/.env.example to OpenBook/openbook/.env and fill in the values you set in the Docker Compose level .env file.
  * GITDB_REPO= should be the repository to be indexed. See [GitDB Database Setup](#gitdb-database-setup).
  * GITDB_REPO_BRANCH= defaults to 'main' if unspecified/commented. It is the name of the branch to index.
  * GITDB_PATH= is the path within the repo where the tables to index are located.
  * Your MONGO_URI will be mongodb://{user}:{password}@mongo:27017/{db name}?authSource=admin. {db name} is the name of the database you wish your GitDB index to be placed in. The default is 'openbook'. The User and Password are the values you specified in the .devcontainer/.env file for Mongo to create an account as.
* Once you have filled in the .env files, press Ctrl + Shift + P and a menu will appear at the top. Type in 'build' and select ''Dev Containers: Rebuild Container". The wording may vary on the first time building the project, something like: "Dev Containers: Build and open in container".
* Once the Dev Container is loaded, Open a new ZSH (or bash) terminal via the top menu or press ```Ctrl + Shift + \````.
* From within the devcontainer:
  * ```$ cd OpenBook/openbook```
  * ```$ yarn```
  * ``` $ yarn start```

## Tasks

### Complete

* Basic git cloning of data and index repositories
* Basic indexing into a collection of remark Node objects
* Support inserting the index data into mongo
* Improve change detection/mongo insertion

### In Progress

* Support querying through REST API
* Support updating through REST API

### TODO

* Support storing basic markdown data through query
* Support encryption of data
* Support Git WebHooks to notify OpenBook of changes
* Support multiple views
* Consider emulating Excel formulas and other support in views without excel so that views with excel make sense, such as a transaction with a computed total based on a quantity and amount, or a _bottom.md with a sum or other totaling mechanism. They render well in Excel, but when queried through the API, they are less useful.

## Authors, License

This work is provided under an MIT license by the [Digital Defiance](https://digitaldefiance.org) Contributors.

The lead architect is [Jessica Mulein](https://github.com/JessicaMulein).
