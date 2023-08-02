import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { IChangedFile } from '../interfaces/changedFile';
import { IFileIndex } from '../interfaces/fileIndex';
import { IIndexTracker } from '../interfaces/indexTracker';
import { GitDB } from './gitdb';
import {
  getRemarkFromMarkdown,
  getRemarkToHtml,
  getRemarkToMarkdown,
} from '../remark';
import { Root } from 'remark-gfm';
import { environment } from '../environment';

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
 * - clearIndices: Clears all indices from MongoDB.
 * - clearIndicesForMissingTables: Clears indices for any tables that no longer exist.
 * - determineChangedFiles: Determines which files have changed in the tables.
 * - determineChangesAndUpdateIncices: Updates indices and writes a new revision.
 * - getAllFilesAsChangedFiles: Gets all files in the GitDB as changed files.
 * - getIndexTracker: Gets the latest index tracker from MongoDB.
 * - getTableFileHash: Calculates the SHA-256 hash of a file.
 * - getTableFileIndex: Gets the latest record of a file from a table in MongoDB.
 * - getTableFileIndexHtml: Gets the HTML representation of a table file from MongoDB
 * - getTableFileIndexMarkdown: Gets the Markdown representation of a table file from MongoDB
 * - getTableFileIndexRoot: Gets the parsed representation of a table file from MongoDB
 * - getTableFiles: Gets all files in a table in MongoDB.
 * - getTables: Gets all tables in the MongoDB.
 * - init: Initializes the GitDBIndex instance.
 * - parseTableFileForIndex: Parses a file for indexing.
 * - updateIndicies: Updates the indices for a set of changed files.
 * - writeIndexTracker: Writes an index tracker to MongoDB.
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

  /**
   * Determines which files have changed in the tables and returns an array of
   * objects representing these changed files.
   * TODO: Use git to determine changed files.
   * @returns An array of objects representing the changed files.
   */
  public async determineChangedFiles(): Promise<IChangedFile[]> {
    console.log('Determining changed files');
    const lastIndexRecord = await this.getIndexTracker();
    const lastGitRevision: string | undefined = lastIndexRecord?.gitHash;
    const changedFiles: IChangedFile[] = [];
    let noChanges = false;
    if (lastIndexRecord && lastGitRevision) {
      const gitChangedFiles = await this.gitDb.getChangedFiles(lastGitRevision);
      if (gitChangedFiles.length === 0) {
        console.log('No changed files found');
        noChanges = true;
      } else {
        for (const changedGitFile of gitChangedFiles) {
          console.log(`Changed file: ${changedGitFile}`)
          // changedFile is a string with the path of the file that is changed
          // first, get the string difference between the fullpath and the mountpoint
          // then, split on / and make sure there are two parts
          // this.gitDb.gitDatabase.fullPath is the mountpoint + the relative path
          // 
          let path = this.gitDb.gitDatabase.relativePath;
          // path may have leading slash, remove it if it does
          if (path.startsWith('/')) {
            path = path.substring(1);
          }
          // append trailing slash if it doesn't exist
          if (!path.endsWith('/')) {
            path += '/';
          }
          const parts = changedGitFile.replace(path, '').split('/');
          if (parts.length !== 2) {
            throw new Error(`Invalid changed file: ${changedGitFile}`);
          }
          const table = parts[0];
          const file = parts[1];
          if (environment.gitdb.excludeFiles.includes(file)) {
            console.log(`Skipping excluded file: ${file}`);
            continue;
          }
          const fileSha256 = this.getTableFileSha256(table, file);
          const changedFile = {
            table,
            file,
            gitHash: await this.gitDb.gitDatabase.getFileHash(table, file),
            sha256: fileSha256,
          };
          console.log(`Changed file: ${JSON.stringify(changedFile)}`)
          changedFiles.push(changedFile);
        }
      }
    } else {
      console.log('No index records found');
      changedFiles.push(...await this.getAllFilesAsChangedFiles());
    }
    console.log('Finished determining index changes');
    if (noChanges) {
      console.log('Skipping index update because no changes were found');
    } else {
      await this.writeIndexTracker(await this.gitDb.gitDatabase.getCurrentRevision(), changedFiles);
    }
    return changedFiles;
  }

  /**
   * Determines which files have changed, updates the indices for these files,
   * and writes a new revision.
   */
  public async determineChangesAndUpdateIncices(): Promise<void> {
    console.log('Updating indicies and writing revision');
    const changes = await this.determineChangedFiles();
    if (changes.length === 0) {
      console.log('No changes found from determineChangedFiles');
    } else {
      console.log(`determineChangedFiles returned: ${JSON.stringify(changes)}`);
      await this.updateIndicies(changes);
    }
    await this.clearIndicesForMissingTables();
  }

  /**
   * Gets a list of all files in the GitDB and returns an array of IChangedFiles objects for them.
   * @returns An array of objects representing all files in the GitDB as changed files.
   */
  public async getAllFilesAsChangedFiles(): Promise<IChangedFile[]> {
    console.log("Getting all files as changed files");
    const changedFiles: IChangedFile[] = [];
    const tables = this.gitDb.getTables();
    for (const table of tables) {
      const tableFiles = this.gitDb.getTableFiles(table);
      for (const file of tableFiles) {
        const gitHash = await this.gitDb.gitDatabase.getFileHash(table, file);
        const sha256 = this.getTableFileSha256(table, file);
        changedFiles.push({
          table,
          file,
          gitHash,
          sha256,
        });
      }
    }
    return changedFiles;
  }

  /**
   * Queries the MongoDB collection 'IndexTracker' for a record that matches
   * @returns A promise that resolves to the latest index tracker record or null.
   */
  public async getIndexTracker(): Promise<IIndexTracker | null> {
    console.log('Getting index tracker');
    return await this.mongo.model<IIndexTracker>('IndexTracker').findOne({
      indexingVersion: GitDBIndex.indexingVersion,
    });
  }

  /**
   * Calculates and returns the SHA-256 hash of the specified file in the
   * specified table.
   * @param table The table containing the file.
   * @param file The file to hash.
   * @returns The calculated hash.
   */
  public getTableFileSha256(table: string, file: string): string {
    const tablePath = join(this.gitDb.gitDatabase.fullPath, table);
    const tableFilePath = join(tablePath, file);
    const hasher = createHash('sha256');
    hasher.update(readFileSync(tableFilePath));
    return hasher.digest('hex');
  }

  /**
   * Queries the MongoDB collection 'IndexFileRecord' for a record that matches
   * the given 'table' and 'file' and has the latest date. Returns the record if
   * found; otherwise, returns null.
   * @param table The table name to match in the query.
   * @param file The file name to match in the query.
   * @returns The found record or null.
   */
  public async getTableFileIndex(
    table: string,
    file: string
  ): Promise<IFileIndex | null> {
    return await this.mongo.model<IFileIndex>('FileIndex').findOne({
      table,
      file,
      indexingVersion: GitDBIndex.indexingVersion,
    });
  }

  public async getTableFileIndexHtml(
    table: string,
    file: string
  ): Promise<string> {
    const root = await this.getTableFileIndexRoot(table, file);
    const remarkHtmlUnified = await getRemarkToHtml();
    const html = await remarkHtmlUnified.stringify(root);
    return html;
  }

  public async getTableFileIndexMarkdown(
    table: string,
    file: string
  ): Promise<string> {
    const root = await this.getTableFileIndexRoot(table, file);
    const remarkMarkdown = await getRemarkToMarkdown();
    const markdown = await remarkMarkdown.stringify(root);
    return markdown;
  }

  /**
   * Gets a given indexed table file node from the mongo database.
   * @param table The table containing the file.
   * @param file The file to parse.
   * @returns The root of the parsed file.
   */
  public async getTableFileIndexRoot(
    table: string,
    file: string
  ): Promise<Root> {
    const indexRecord = await this.getTableFileIndex(table, file);
    if (!indexRecord) {
      throw new Error(`No index record found for ${table}/${file}`);
    }
    const node: Root = indexRecord.record as Root;
    return node;
  }

  /**
   * Gets all files for the specified table in the mongo database.
   * @param table The table to get the files for.
   * @returns An array of file names.
   */
  public async getTableFiles(table: string): Promise<string[]> {
    // query mongo for all distinct file names, making sure indexingVersion matches
    const files = await this.mongo
      .model<IFileIndex>('FileIndex')
      .distinct('file', {
        table,
        indexingVersion: GitDBIndex.indexingVersion,
      });
    return files;
  }

  /**
   * Gets a list of all tables in the mongo database.
   * @returns A promise that resolves to a list of tables in the database.
   */
  public async getTables(): Promise<string[]> {
    // query mongo for all distinct table names, making sure indexingVersion matches
    const tables = await this.mongo
      .model<IFileIndex>('FileIndex')
      .distinct('table', {
        indexingVersion: GitDBIndex.indexingVersion,
      });
    return tables;
  }

  /**
   * Initializes the GitDBIndex instance by setting up the MongoDB connection.
   * Not available until after GitDB.init() has been called.
   */
  public async init(): Promise<void> {
    this._mongo = this.gitDb.mongoConnector;
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
  ): Promise<Root> {
    /* Use remark to parse the index file and output a record object */
    const tableFilePath = join(this.gitDb.gitDatabase.fullPath, table, file);
    if (!existsSync(tableFilePath)) {
      throw new Error(`Table file does not exist: ${tableFilePath}`);
    }
    const tableData = readFileSync(tableFilePath, 'utf-8');
    const remarkFromMarkdown = await getRemarkFromMarkdown();
    return remarkFromMarkdown.parse(tableData);
  }

  /**
   * Loops through the given array of changed files and updates the indices by
   * parsing the files, calculating their hashes, and writing new index records
   * to MongoDB.
   * @param changedFiles An array of objects representing the changed files.
   */
  public async updateIndicies(changedFiles: IChangedFile[]): Promise<void> {
    console.log('Updating indicies for changed files');
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
          file: file,
          gitHash: await this.gitDb.gitDatabase.getFileHash(table, file),
          indexingVersion: GitDBIndex.indexingVersion,
          record: rootNode,
          sha256: fileHash,
          table,
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
   * Writes a new gitHash
   * @param gitHash The git hash to write to the index tracker.
   * @returns 
   */
  public async writeIndexTracker(gitHash: string, changes: IChangedFile[]): Promise<IIndexTracker> {
    console.log(`Writing index tracker for ${gitHash}`)
    const indexTracker = await this.mongo
      .model<IIndexTracker>('IndexTracker')
      .findOneAndUpdate(
        { indexingVersion: GitDBIndex.indexingVersion },
        {
          $set: {
            changes,
            gitHash,
            indexingVersion: GitDBIndex.indexingVersion,
            date: new Date(),
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    return indexTracker;
  }
}
