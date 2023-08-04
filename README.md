# node-GitDB

Node-GitDB REST API:

<img width="1248" alt="image" src="https://github.com/Digital-Defiance/node-gitdb/assets/3766240/9ba17b9e-f9b9-4722-aac6-96ea95e89e7f">

GitDB Markdown Database Structure:

<img width="515" alt="image" src="https://github.com/Digital-Defiance/node-gitdb/assets/3766240/285c72b9-24bd-4855-ad2d-0b9e8e68cc1f">

GitDB JSON (this format is what is stored in Mongo):

<img width="696" alt="image" src="https://github.com/Digital-Defiance/node-gitdb/assets/3766240/07423d9a-94de-46a7-a172-6be9d31a1f51">

Example Markdown (viewed in Typora)

![image](https://github.com/Digital-Defiance/node-gitdb/assets/3766240/dca2f606-414d-47ec-be3a-631b6146ea44)

<img width="955" alt="image" src="https://github.com/Digital-Defiance/node-gitdb/assets/3766240/e6eef79c-de19-4eaf-8b03-711d118a8ca6">


Note: Node-GitDB is in pre-alpha, is incomplete, and undergoing development. (See [#Complete](#Complete))

-----

Node-GitDB is an experimental git versioned markdown filesystem to mongo orchestrator. Rather than re-inventing the wheel, we opted to use MongoDB to store the data, and this is a service that uses git to determine updates needed for the mongodb. This little service can currently be run on a cron or manually to sync up the data. In the future it will support webhooks to automatically update the data.

It is intended to take data from a human readable repository in markdown format (maximum, single folder level depth) in a mostly human-readable format. It is not designed for huge databases- is intended for relatively small (hundreds or thousands of records) databases, such as member lists, or other small datasets. It is limited by the filesystem, its speed, and the additional overhead of git and parsing markdown.

It is designed to be Markdown friendly, although users do need to be careful about the format of their data.

## Rationale

As a non-profit, most of what Digital Defiance does needs to be public. Node-GitDB is a way to store data in a way that is version controlled, human-readable,
and whose records can also be managed and added to by humans. Examples would include member lists and possibly financial transactions.

Node-GitDB seeks to be a way for similar organizations to manage their membership records and other data.

## Mechanism of action

We will utilize git status and git diff to determine changes and we will store all the parsed markdown in the database respository under a separate repo so that its hashes are managed separately. We will use 'remark' and 'remark-gfm' to parse the markdown at index time, and produce a collection of parsed markdown files, ready to query. This map will constitute the 'database'. We will then insert/upsert all the documents into mongo for easy querying. The mongo is continually refreshed by the git repository.

After indexing has been performed, a node express server will start up and provide a REST API to query the data.
Documents can be requested in a variety of formats, including markdown, html, and json.

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
* ```$ git clone https://github.com/Digital-Defiance/node-gitdb.git```
* Open Visual Studio Code and 'open folder' to the node-gitdb directory
* Once Visual Studio Code has loaded the project it should detect the .devcontainer/devcontainer.json file and offer to reopen in the container down in the lower right. You should decline until you have copied the /.devcontainer/.env.example to /.devcontainer/.env and filled in the values you desire to be your Mongo user/password. This .env file is used by docker-compose to set up mongo with a pre-specified user and password.
  * MONGO_DB_USERNAME
  * MONGO_DB_PASSWORD
* There is another .env in node-gitdb (one level under the repo root. Copy node-gitdb/node-gitdb/.env.example to node-gitdb/.env and fill in the values you set in the Docker Compose level .env file.
  * GITDB_REPO= should be the repository to be indexed. See [GitDB Database Setup](#gitdb-database-setup).
  * GITDB_REPO_BRANCH= defaults to 'main' if unspecified/commented. It is the name of the branch to index.
  * GITDB_PATH= is the path within the repo where the tables to index are located.
  * Your MONGO_URI will be mongodb://{user}:{password}@mongo:27017/{db name}?authSource=admin. {db name} is the name of the database you wish your GitDB index to be placed in. The default is 'node-gitdb'. The User and Password are the values you specified in the .devcontainer/.env file for Mongo to create an account as.
* Once you have filled in the .env files, press Ctrl + Shift + P and a menu will appear at the top. Type in 'build' and select ''Dev Containers: Rebuild Container". The wording may vary on the first time building the project, something like: "Dev Containers: Build and open in container".
* Once the Dev Container is loaded, Open a new ZSH (or bash) terminal via the top menu or press ```Ctrl + Shift + \````.
* From within the devcontainer:
  * ```$ cd node-gitdb/node-gitdb```
  * ```$ yarn```
  * ``` npx nx serve```

## Complete
* Basic git cloning of data and index repositories
* Basic indexing into a collection of remark Node objects
* Support inserting the index data into mongo
* Improve change detection/mongo insertion

## In Progress
* Support querying/updating through REST API

## TODO
* Support storing basic markdown data through query
* Support encryption of data
* Support Git WebHooks to notify Node-GitDB of changes
