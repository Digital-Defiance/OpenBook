import { createHash, Hash } from 'crypto';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { Node } from 'unist';

import { IIndexRecord } from '../interfaces/indexRecord';
import { IIndexRoot } from '../interfaces/indexRoot';
import { GitDB } from './gitdb';
import { getRemark } from '../remark';
import { environment } from '../environment';

export class GitDBIndex {
  public readonly gitDB: GitDB;
  public static readonly indexingVersion = '0.0.0';
  public readonly indexFile: string;
  public readonly indexPath: string;
  public readonly fullIndexPath: string;
  public readonly fullIndexFilePath: string;
  private readonly tableRoots = new Map<string, IIndexRecord>();

  constructor(gitDb: GitDB) {
    this.gitDB = gitDb;
    this.indexFile = environment.index.file;
    this.indexPath = environment.index.path;
    this.fullIndexPath = join(this.gitDB.gitDatabase.mountPoint, this.indexPath);
    this.fullIndexFilePath = join(this.fullIndexPath, this.indexFile);
  }

  public async init(): Promise<void> {
    console.log('Reading existing indices');
    // get a list of tables and read in any existing index files
    const tables = this.gitDB.getTables();
    for (const table of tables) {
      const result = await this.readIndexFile(table);
      if (result) {
        console.log(`Read index file for table: ${table}`);
      } else {
        console.log(`No index file found for table: ${table}`);
      }
    }
  }

  /**
   * Look at the db mountpoint and see if indexDirectory exists
   * if it does, pull the index revision
   */
  public async determineIndexHash(): Promise<string | null> {
    if (!existsSync(this.fullIndexFilePath)) {
      return null;
    }
    try {
      const index = JSON.parse(readFileSync(this.fullIndexFilePath, 'utf-8'));
      return index.hash || null;
    } catch (error) {
      console.error('Failed to parse JSON from index file: ', error);
      throw error;
    }
  }

  /**
   * Based on the current revision of the database and the index, determine what has changed
   * and return a list of changed tables. If the index does not exist, return all tables.
   */
  public async determineIndexChanges(): Promise<string[]> {
    console.log('Determining index changes');
    const existingIndexHash = await this.determineIndexHash();
    const currentDatabaseRevision =
      await this.gitDB.gitDatabase.getCurrentRevision();

    // If there is no existing index, return all files
    if (!existingIndexHash) {
      console.log('No existing index, returning all files');
      return this.gitDB.getTables();
    }

    // If the current revision and the existing index hash are the same,
    // there are no changes
    if (existingIndexHash === currentDatabaseRevision) {
      return [];
    }

    // If the current revision and the existing index hash are different,
    // determine and return the changes
    return this.gitDB.getChangedTables(
      existingIndexHash,
      currentDatabaseRevision
    );
  }

  public async readIndexFile(table: string): Promise<boolean> {
    if (!existsSync(this.fullIndexPath)) {
      return false;
    }
    const tablePath = join(this.fullIndexPath, table);
    const tableFilePath = join(tablePath, this.indexFile);
    if (!existsSync(tableFilePath)) {
      return false;
    }
    const indexData = readFileSync(tableFilePath, 'utf-8');
    const index = JSON.parse(indexData) as IIndexRecord;
    this.tableRoots.set(table, index);
    return true;
  }

  /**
   * Indexes a given file from the given table
   * @param table 
   * @param file 
   * @returns Node containing the root of the parsed file
   */
  public async parseTableFileForIndex(table: string, file: string): Promise<Node> {
    /* Use remark to parse the index file and output a record object */
    const tableFilePath = join(this.gitDB.gitDatabase.fullPath, table, file);
    if (!existsSync(tableFilePath)) {
      throw new Error(`Table file does not exist: ${tableFilePath}`);
    }
    const tableData = readFileSync(tableFilePath, 'utf-8');
    const remarkUnified = await getRemark();
    return remarkUnified.parse(tableData);
  }

  public async updateIndicies(changedTables: string[]): Promise<void> {
    console.log('Updating indicies');
    // Loop through each of the changed tables
    for (const table of changedTables) {
      console.log(`Processing table: ${table}`);

      // Initialize a new hash for this table
      const hash = createHash('sha256');

      // Get the list of files for this table
      const files = this.gitDB.getTableFiles(table);

      // Initialize an array to store the records for this table
      const tableRecords: Node[] = [];

      // Loop through each of the files in the table
      for (const file of files) {
        console.log(`Processing file: ${file}`);

        // Update the hash with the contents of the file
        const filePath = join(this.gitDB.gitDatabase.fullPath, table, file);
        await this.updateHashWithFile(hash, filePath);

        // Parse the file and add its contents to the table records
        const rootNode = await this.parseTableFileForIndex(table, file);
        tableRecords.push(rootNode);
        console.log(rootNode);
      }

      // Finalize the hash and store it in the map
      const tableHash = hash.digest('hex');
      console.log(`Finished processing table: ${table}, hash: ${tableHash}`);

      this.tableRoots.set(table, {
        records: tableRecords,
        hash: tableHash,
      });

      // Write the table records and hash to the index
      await this.writeTableToIndex(table, tableRecords, tableHash);
    }
  }

  private async writeTableToIndex(
    table: string,
    records: Node[],
    hash: string
  ): Promise<void> {
    console.log(`Writing table to index: ${table}`);

    // Ensure the directory for the table exists in the index
    const indexTablePath = join(this.fullIndexPath, table);
    if (!existsSync(indexTablePath)) {
      console.log(`Creating directory for table in index: ${table}`);
      mkdirSync(indexTablePath, { recursive: true });
    }

    // Write the records and hash for the table to a file in the index
    const indexTableFilePath = join(indexTablePath, this.indexFile);
    const data: IIndexRecord = { records, hash };
    writeFileSync(indexTableFilePath, JSON.stringify(data));
  }

  private updateHashWithFile(hash: Hash, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath);

      stream.on('data', (chunk) => {
        // Update the hash with this chunk of data
        hash.update(chunk);
      });

      stream.on('end', () => {
        resolve();
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Write the current revision of the database to the index
   */
  public async writeIndexRevision(): Promise<void> {
    console.log(
      'Getting DB revision in preperation for writing index revision'
    );
    const index: IIndexRoot = {
      database: await this.gitDB.gitDatabase.getCurrentRevision(),
      version: GitDBIndex.indexingVersion,
    };
    console.log(`Writing index revision to ${this.fullIndexFilePath}`);
    if (!existsSync(this.fullIndexPath)) {
      console.log(`Creating index directory ${this.fullIndexPath}`);
      mkdirSync(this.fullIndexPath, { recursive: true });
    }
    writeFileSync(this.fullIndexFilePath, JSON.stringify(index));
  }

  public async updateIndiciesAndWriteRevision(): Promise<void> {
    console.log('Updating indicies and writing revision');
    const changes = await this.determineIndexChanges();
    console.log(`Changes: ${changes.join(', ')}`);
    await this.updateIndicies(changes);
    await this.writeIndexRevision();
  }
}
