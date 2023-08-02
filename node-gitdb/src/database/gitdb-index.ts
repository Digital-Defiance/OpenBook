import { createHash, Hash } from 'crypto';
import { createReadStream, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Node } from 'unist';

import { IChangedFile } from '../interfaces/changedFile';
import { IFileIndex } from '../interfaces/fileIndex';
import { GitDB } from './gitdb';
import { getRemark } from '../remark';

/**
 * GitDBIndex is a class responsible for handling the indexing of a GitDB
 * instance. It connects to a MongoDB, calculates hashes for files, determines
 * file changes, parses files for indexing, and updates indices in MongoDB.
 *
 * Properties:
 * - gitDb: Instance of GitDB.
 * - mongo: Mongoose instance for connecting to MongoDB.
 *
 * Methods:
 * - init: Initializes the GitDBIndex instance.
 * - getTableFileIndex: Gets the latest record of a file from a table in MongoDB.
 * - getTableFileHash: Calculates the SHA-256 hash of a file.
 * - determineChangedFiles: Determines which files have changed in the tables.
 * - determineChangesAndUpdateIncices: Updates indices and writes a new revision.
 * - parseTableFileForIndex: Parses a file for indexing.
 * - updateIndicies: Updates the indices for a set of changed files.
 * - updateHashWithFile: Updates a hasher with data from a file.
 *
 * @property {GitDB} gitDb - An instance of GitDB to be indexed.
 * @property {mongoose} [mongo] - Mongoose instance for MongoDB operations.
 */
export class GitDBIndex {
  private readonly gitDb: GitDB;
  private _mongo?: typeof import('mongoose');
  public get mongo(): typeof import('mongoose') {
    if (!this._mongo) {
      throw new Error('Mongo has not been initialized');
    }
    return this._mongo;
  }
  public static readonly indexingVersion = '0.0.0';

  constructor(gitDb: GitDB) {
    this.gitDb = gitDb;
  }

  /**
   * Initializes the GitDBIndex instance by setting up the MongoDB connection.
   * Not available until after GitDB.init() has been called.
   */
  public async init(): Promise<void> {
    this._mongo = this.gitDb.mongoConnector;
  }

  /**
   * Queries the MongoDB collection 'IndexFileRecord' for a record that matches
   * the given 'table' and 'file' and has the latest date. Returns the record if
   * found; otherwise, returns null.
   * @param table The table name to match in the query.
   * @param file The file name to match in the query.
   * @returns The found record or null.
   */
  public getTableFileIndex(
    table: string,
    file: string
  ): Promise<IFileIndex | null> {
    return this.mongo
      .model<IFileIndex>('FileIndex')
      .find({
        table,
        file,
      })
      .sort({ date: -1 })
      .limit(1)
      .then((records) => {
        if (records.length === 0) {
          return null;
        }
        return records[0];
      });
  }

  /**
   * Calculates and returns the SHA-256 hash of the specified file in the
   * specified table.
   * @param table The table containing the file.
   * @param file The file to hash.
   * @returns The calculated hash.
   */
  public getTableFileHash(table: string, file: string): string {
    const tablePath = join(this.gitDb.gitDatabase.fullPath, table);
    const tableFilePath = join(tablePath, file);
    const hasher = createHash('sha256');
    hasher.update(readFileSync(tableFilePath));
    return hasher.digest('hex');
  }

  /**
   * Determines which files have changed in the tables and returns an array of
   * objects representing these changed files.
   * @returns An array of objects representing the changed files.
   */
  public async determineChangedFiles(): Promise<IChangedFile[]> {
    console.log('Determining index changes');
    const tables = this.gitDb.getTables();
    const changedFiles: IChangedFile[] = [];
    for (const table of tables) {
      const tableFiles = this.gitDb.getTableFiles(table);
      for (const file of tableFiles) {
        const indexRecord = await this.getTableFileIndex(table, file);
        if (!indexRecord) {
          console.log(`Table file is new: ${table}/${file}`);
          changedFiles.push({
            table,
            file,
          });
        } else {
          const fileHash = this.getTableFileHash(table, file);
          if (fileHash !== indexRecord.hash) {
            console.log(`Table file has changed: ${table}/${file}`);
            changedFiles.push({
              table,
              file,
            });
          }
        }
      }
    }
    console.log('Finished determining index changes');
    return changedFiles;
  }

  /**
   * Parses the specified file in the specified table using the remark tool and
   * returns the root of the parsed file.
   * @param table The table containing the file.
   * @param file The file to parse.
   * @returns The root of the parsed file.
   */
  public async parseTableFileForIndex(
    table: string,
    file: string
  ): Promise<Node> {
    /* Use remark to parse the index file and output a record object */
    const tableFilePath = join(this.gitDb.gitDatabase.fullPath, table, file);
    if (!existsSync(tableFilePath)) {
      throw new Error(`Table file does not exist: ${tableFilePath}`);
    }
    const tableData = readFileSync(tableFilePath, 'utf-8');
    const remarkUnified = await getRemark();
    return remarkUnified.parse(tableData);
  }

  /**
   * Loops through the given array of changed files and updates the indices by
   * parsing the files, calculating their hashes, and writing new index records
   * to MongoDB.
   * @param changedFiles An array of objects representing the changed files.
   */
  public async updateIndicies(changedFiles: IChangedFile[]): Promise<void> {
    console.log('Updating indicies');
    // Loop through each of the changed tables
    for (const { table, file } of changedFiles) {
      console.log(`Processing table/file: ${table}/${file}`);

      // Update the hash with the contents of the file
      const filePath = join(this.gitDb.gitDatabase.fullPath, table, file);
      // Initialize a new hash for this table
      const fileHasher = createHash('sha256');
      fileHasher.update(readFileSync(filePath));
      // Finalize the hash and store it in the map
      const fileHash = fileHasher.digest('hex');

      // Parse the file and add its contents to the table records
      const rootNode = await this.parseTableFileForIndex(table, file);
      console.log(rootNode);

      const query = {
        table,
        file,
        indexingVersion: GitDBIndex.indexingVersion,
      };
      const update = {
        $set: {
          table,
          hash: fileHash,
          record: rootNode,
          indexingVersion: GitDBIndex.indexingVersion,
          date: new Date(),
        },
      };
      const options = { upsert: true, new: true, setDefaultsOnInsert: true };

      // Find the document
      await this.mongo
        .model<IFileIndex>('FileIndex')
        .findOneAndUpdate(query, update, options);
    }
  }

  /**
   * Determines which files have changed, updates the indices for these files,
   * and writes a new revision.
   */
  public async determineChangesAndUpdateIncices(): Promise<void> {
    console.log('Updating indicies and writing revision');
    const changes = await this.determineChangedFiles();
    console.log(`Changes: ${JSON.stringify(changes)}`);
    await this.updateIndicies(changes);
    await this.clearIndicesForMissingTables();
  }

  /**
   * Clears the indices for the specified table and file, or all indices if no
   * table or file is specified.
   * @param table Table name
   * @param file File name
   */
  public async clearIndices(table?: string, file?: string): Promise<void> {
    if (table && file) {
      console.log(`Clearing index for ${table}/${file}`);
      await this.mongo.model<IFileIndex>('FileIndex').deleteMany({
        table,
        file,
        indexingVersion: GitDBIndex.indexingVersion,
      });
    } else if (table) {
      console.log(`Clearing index for ${table}`);
      await this.mongo.model<IFileIndex>('FileIndex').deleteMany({
        table,
        indexingVersion: GitDBIndex.indexingVersion,
      });
    } else {
      console.log(`Clearing all indices`);
      await this.mongo.model<IFileIndex>('FileIndex').deleteMany({
        indexingVersion: GitDBIndex.indexingVersion,
      });
    }
  }

  /**
   * Clears the indices for any tables that no longer exist.
   */
  public async clearIndicesForMissingTables(): Promise<void> {
    console.log(`Clearing indices for missing tables`);
    const tableNames = this.gitDb.getTables();
    // delete indices where table is not in tableNames
    await this.mongo.model<IFileIndex>('FileIndex').deleteMany({
      table: { $nin: tableNames },
      indexingVersion: GitDBIndex.indexingVersion,
    });
  }
}
