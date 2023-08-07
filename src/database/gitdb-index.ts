import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Root } from 'remark-gfm';

import { IChangedFile } from '../interfaces/changedFile';
import { IFileIndex } from '../interfaces/fileIndex';
import { IFileNode } from '../interfaces/fileNode';
import { IIndexTracker } from '../interfaces/indexTracker';
import { GitDB } from './gitdb';
import {
  getRemarkFromMarkdown,
  getRemarkToHtml,
  getRemarkToMarkdown,
} from '../remark';
import { IAggregateResponse } from '../interfaces/aggregateResponse';
import { IAggregateQueryResponse } from '../interfaces/aggregateQueryResponse';
import { IViewResponse } from '../interfaces/viewResponse';
import { IViewRoot } from '../interfaces/viewRoot';

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
      await this.mongo.model<IFileNode>('FileNode').deleteMany({
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
      await this.mongo.model<IFileNode>('FileNode').deleteMany({
        table,
        indexingVersion: GitDBIndex.indexingVersion,
      });
    } else {
      console.log(`Clearing all indices`);
      await this.mongo.model<IFileIndex>('FileIndex').deleteMany({
        indexingVersion: GitDBIndex.indexingVersion,
      });
      await this.mongo.model<IFileNode>('FileNode').deleteMany({
        indexingVersion: GitDBIndex.indexingVersion,
      });
    }
  }

  public async clearIndicesForMissingFiles(): Promise<void> {
    console.log(`Clearing indices for missing files`);
    const tableNames = this.gitDb.getTables();
    for (const tableName of tableNames) {
      console.log(`Clearing indices for missing files in ${tableName}`)
      const fileNames = this.gitDb.getTableFiles(tableName);
      // delete indices where file is not in fileNames
      await this.mongo.model<IFileIndex>('FileIndex').deleteMany({
        table: tableName,
        file: { $nin: fileNames },
        indexingVersion: GitDBIndex.indexingVersion,
      });
      await this.mongo.model<IFileNode>('FileNode').deleteMany({
        table: tableName,
        file: { $nin: fileNames },
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
    await this.mongo.model<IFileNode>('FileNode').deleteMany({
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
          console.log(`Changed file: ${changedGitFile}`);
          const parts = changedGitFile.split('/');

          if (parts.length !== 2) {
            throw new Error(`Invalid changed file: ${changedGitFile}`);
          }
          const table = parts[0];
          const file = parts[1];
          const fileSha256 = this.getTableFileSha256(table, file);
          const changedFile = {
            table,
            file,
            gitHash: await this.gitDb.gitDatabase.getFileHash(table, file),
            sha256: fileSha256,
          };
          console.log(`Changed file: ${JSON.stringify(changedFile)}`);
          changedFiles.push(changedFile);
        }
      }
    } else {
      console.log('No index records found');
      changedFiles.push(...(await this.getAllFilesAsChangedFiles()));
    }
    console.log('Finished determining index changes');
    if (noChanges) {
      console.log('Skipping index update because no changes were found');
    } else {
      await this.writeIndexTracker(
        await this.gitDb.gitDatabase.getCurrentRevision(),
        changedFiles
      );
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
    await this.clearIndicesForMissingFiles();
  }

  public async getAggregateForTableByFile(table: string, paths: string[]): Promise<IAggregateResponse> {
    const aggregates = await this.mongo
      .model<IFileNode>('FileNode')
      .find({ table, path: { $in: paths }, indexingVersion: GitDBIndex.indexingVersion, value: { $exists: true } })
      .sort('file');
    const aggregatesByFile: { [file: string]: { [path: string]: any } } = {};
    for (const aggregate of aggregates) {
      if (!aggregatesByFile[aggregate.file]) {
        aggregatesByFile[aggregate.file] = {};
      }
      aggregatesByFile[aggregate.file][aggregate.path] = aggregate.value.trim() ?? null;
    }
    return aggregatesByFile;
  }

  public async getAggregateForTable(table: string, path: string): Promise<IFileNode[]> {
    const aggregates = await this.mongo
      .model<IFileNode>('FileNode')
      .find({ table, path, indexingVersion: GitDBIndex.indexingVersion, value: { $exists: true } })
      .sort('file');
    return aggregates;
  }

  /**
   * Gets a list of all files in the GitDB and returns an array of IChangedFiles objects for them.
   * @returns An array of objects representing all files in the GitDB as changed files.
   */
  public async getAllFilesAsChangedFiles(): Promise<IChangedFile[]> {
    console.log('Getting all files as changed files');
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

  public async getTableFileIndices(
    table: string,
    includeNonData = false
  ): Promise<IFileIndex[]> {
    return await this.mongo
      .model<IFileIndex>('FileIndex')
      .find({
        indexingVersion: GitDBIndex.indexingVersion,
        table,
        ...(includeNonData ? {} : { data: true }),
      })
      .sort({ file: 1 });
  }

  /**
   * Gets all files for the specified table in the mongo database.
   * @param table The table to get the files for.
   * @returns An array of file names.
   */
  public async getTableFiles(table: string, dataOnly = false): Promise<string[]> {
    const query = {
      table,
      indexingVersion: GitDBIndex.indexingVersion,
    };
    if (dataOnly) {
      query['data'] = true;
    }

    // query mongo for all distinct file names, making sure indexingVersion matches
    const files = await this.mongo
      .model<IFileIndex>('FileIndex')
      .distinct('file', query)
      .sort();
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

  private fileIsData(file: string): boolean {
    // if file is template.md, *.template.md, or README.md, it is not data
    if (
      file === 'template.md' ||
      file === 'README.md' ||
      file.endsWith('.template.md')
    ) {
      return false;
    }
    return true;
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
          data: this.fileIsData(file),
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
      const fileIndex: IFileIndex = await this.mongo
        .model<IFileIndex>('FileIndex')
        .findOneAndUpdate(query, update, options);
        if (fileIndex.data) {
          await this.updateFileNodes(fileIndex);
        }
    }
  }

  /**
   * Writes a new gitHash
   * @param gitHash The git hash to write to the index tracker.
   * @returns
   */
  public async writeIndexTracker(
    gitHash: string,
    changes: IChangedFile[]
  ): Promise<IIndexTracker> {
    console.log(`Writing index tracker for ${gitHash}`);
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
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    return indexTracker;
  }

  public static convertToIFileNodes(fileIndex: IFileIndex): IFileNode[] {
    console.log(
      `Converting file index to file nodes: ${fileIndex.table}/${fileIndex.file}`
    );
    if (fileIndex.indexingVersion !== GitDBIndex.indexingVersion) {
      throw new Error(
        `File index has incorrect indexing version: ${fileIndex.indexingVersion}`
      );
    }
    const nodes: IFileNode[] = [];

    function traverse(node: any, path: string) {
      if (node.children && node.children.length > 0) {
        node.children.forEach((child: any, index: number) => {
          const childPath = `${path}.${index}.${child.type}`;
          traverse(child, childPath);
        });
      }

      const newNode: IFileNode = {
        table: fileIndex.table,
        file: fileIndex.file,
        path: path,
        indexingVersion: fileIndex.indexingVersion,
        date: fileIndex.date,
      };

      if (node.value !== undefined) {
        newNode.value = node.value;
      } else if (node.checked !== undefined) {
        newNode.value = node.checked ? 'true' : 'false';
      }

      nodes.push(newNode);
    }

    // Start traversal from root
    traverse(fileIndex.record, 'root');

    return nodes;
  }

  public async updateFileNodes(fileIndex: IFileIndex): Promise<void> {
    console.log(
      `Updating file nodes for file index: ${fileIndex.table}/${fileIndex.file}`
    );
    console.log('Deleting existing file nodes');
    await this.mongo
      .model<IFileNode>('FileNode')
      .deleteMany({ fileIndexId: fileIndex._id });
    const nodes = GitDBIndex.convertToIFileNodes(fileIndex);
    console.log(`Inserting ${nodes.length} file nodes`);
    await this.mongo.model<IFileNode>('FileNode').insertMany(nodes);
  }

  /**
   * Given a viewRoot and retrieved viewData, build a viewResponse
   * @param viewRoot The viewRoot to use for mapping
   * @param viewData The viewData to map
   * @returns A viewResponse with the mapped data
   */
  public buildViewFromViewRootAndAggregates(
    viewRoot: IViewRoot,
    viewData: IAggregateResponse
  ): IViewResponse {
    const viewResponse: IViewResponse = {};
    // for each file in the viewData, remap from path => value to column_name => value
    // viewRoot has path => column_name
    // viewData has file => [ { path => value } ]
    // we want file => [ { column_name => value } ]
    Object.keys(viewData).forEach((file) => {
      viewResponse[file] = {};
      Object.keys(viewData[file]).forEach((path) => {
        const column_name = viewRoot[path];
        viewResponse[file][column_name] = viewData[file][path] ?? '';
      });
    });
    return viewResponse;
  }

  public condenseViewResponse(
    viewRoot: IViewRoot,
    viewResponse: IViewResponse
  ): string[][] {
    const headerRow: string[] = Object.values(viewRoot);
    const rows: string[][] = [headerRow];
    Object.keys(viewResponse).forEach((file) => {
      const row = [];
      // ensure every column has a value, as not every column may be in the viewResponse
      headerRow.forEach((column) => {
        row.push(viewResponse[file][column] ?? '');
      });
      rows.push(row);
    });
    return rows;
  }

  public async getAggregateQueryResponse(table: string, path: string): Promise<IAggregateQueryResponse[]> {
    const aggregate: IFileNode[] = await this.getAggregateForTable(table, path);
    const response: IAggregateQueryResponse[] = [];
    for (const fileNode of aggregate) {
      response.push({ 
        file: fileNode.file,
        value: fileNode.value,
       });
    }
    return response;
  }

  public async getRenderedView(table: string): Promise<IViewResponse> {
    const viewData = await this.gitDb.getViewJson(table);
    const paths = this.gitDb.getViewPathsFromViewRoot(viewData);
    const aggregate = await this.getAggregateForTableByFile(table, paths);
    const response = this.buildViewFromViewRootAndAggregates(
      viewData,
      aggregate
    );
    return response;
  }

  public async getCondensedView(table: string): Promise<string[][]> {
    const viewData = await this.gitDb.getViewJson(table);
    const paths = this.gitDb.getViewPathsFromViewRoot(viewData);
    const aggregate = await this.getAggregateForTableByFile(table, paths);
    const response = this.buildViewFromViewRootAndAggregates(
      viewData,
      aggregate
    );
    return this.condenseViewResponse(viewData, response);
  }
}
