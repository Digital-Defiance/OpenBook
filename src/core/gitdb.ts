import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import moment from 'moment';
import { connect } from 'mongoose';
import { join } from 'path';
import { GitOperations } from './gitOperations';
import { GitDBIndex } from './gitdb-index';
import { environment } from '../environment';
import { IViewRoot } from '../interfaces/viewRoot';

/**
 * GitDB is the Git-based on-disk component of OpenBook. It is responsible for
 * checking out the git repository containing the markdown formatted database
 * and providing methods to index (into mongo) and query the database.
 *
 * GitDB refers to the on-disk part, and GitDBIndex refers to the mongo index.
 */
export class GitDB {
  public readonly gitDatabase: GitOperations;
  public readonly index: GitDBIndex;
  private mongo?: typeof import('mongoose');
  public get mongoConnector(): typeof import('mongoose') {
    if (!this.mongo) {
      throw new Error('Mongo has not been initialized');
    }
    return this.mongo;
  }

  constructor(gitDatabase: GitOperations) {
    this.gitDatabase = gitDatabase;
    this.index = new GitDBIndex(this);
  }

  public async getChangedFiles(sinceRevision: string): Promise<string[]> {
    return await this.gitDatabase.getChangedMarkdownFiles(sinceRevision);
  }

  public static alphaSort(a: string, b: string): number {
    if (a === '_top.md') return -1;
    if (b === '_top.md') return 1;
    if (a === '_bottom.md') return 1;
    if (b === '_bottom.md') return -1;

    // Extract potential date strings using regex
    const dateRegex = /(\d{2}-\d{2}-\d{4}|\d{8}|\d{4}-\d{2}-\d{2})/;
    const aDateMatch = a.match(dateRegex);
    const bDateMatch = b.match(dateRegex);

    const aDate = aDateMatch
      ? moment(aDateMatch[0], ['MM-DD-YYYY', 'MMDDYYYY', 'YYYY-MM-DD'])
      : null;
    const bDate = bDateMatch
      ? moment(bDateMatch[0], ['MM-DD-YYYY', 'MMDDYYYY', 'YYYY-MM-DD'])
      : null;

    if (aDate && aDate.isValid() && bDate && bDate.isValid()) {
      return aDate.diff(bDate);
    }

    const aNumbers = a.match(/\d+/g);
    const bNumbers = b.match(/\d+/g);
    const aLastNumber = aNumbers
      ? parseInt(aNumbers[aNumbers.length - 1], 10)
      : null;
    const bLastNumber = bNumbers
      ? parseInt(bNumbers[bNumbers.length - 1], 10)
      : null;

    if (aLastNumber !== null && bLastNumber !== null) {
      const numberComparison = aLastNumber - bLastNumber;
      if (numberComparison !== 0) {
        return numberComparison;
      }
    } else if (aLastNumber !== null) {
      return -1;
    } else if (bLastNumber !== null) {
      return 1;
    }

    // If numbers are the same or there are no numbers, sort alphabetically
    return a.localeCompare(b);
  }

  public static collectionSort<T extends Record<string, any>>(
    collection: T[],
    columnName: keyof T
  ): void {
    collection.sort((itemA, itemB) => {
      const valueA = String(itemA[columnName]);
      const valueB = String(itemB[columnName]);
      return GitDB.alphaSort(valueA, valueB);
    });
  }

  /**
   * Recurse into the specified table and return a list of all files
   */
  public getTableFiles(table: string): string[] {
    console.log(`Getting files in table: ${table}`);
    const tablePath = join(this.gitDatabase.fullPath, table);
    const files = readdirSync(tablePath);
    const returnedFiles: string[] = [];
    // do a human numeric sort on the files from readdir
    // place _top at the top and _bottom at the bottom
    // try to sort a file before b file, etc.
    // file 1 should be before file 100
    files.sort((a, b) => GitDB.alphaSort(a, b));
    files.forEach((file) => {
      if (file.startsWith('.')) {
        return;
      }
      const fullPath = join(tablePath, file);
      const relativePath = join(table, file);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        // ignore nested directories
        console.log(`Ignoring nested directory: ${relativePath}`);
      } else if (file.endsWith('.md')) {
        returnedFiles.push(file);
      } else {
        console.log(`Ignoring file: ${relativePath}`);
      }
    });
    return returnedFiles;
  }

  /**
   * Get a list of all tables in the database
   * @returns a list of all tables in the database
   */
  public getTables(): string[] {
    const tables = readdirSync(this.gitDatabase.fullPath);
    tables.sort((a, b) => GitDB.alphaSort(a, b));
    return tables.filter((table) => {
      const fullPath = join(this.gitDatabase.fullPath, table);
      return statSync(fullPath).isDirectory() && !table.startsWith('.');
    });
  }

  public getViewJson(table: string): IViewRoot {
    const defaultResult: IViewRoot = {
      version: 2,
      options: {
        includeFileName: true,
      },
      columns: {}
    };
    if (!this.hasViewJson(table)) {
      return defaultResult;
    }
    const viewJsonPath = join(this.gitDatabase.fullPath, table, 'view.json');
    const viewJsonString = readFileSync(viewJsonPath, 'utf-8');
    try {
      const viewJson = JSON.parse(viewJsonString) as IViewRoot;
      return viewJson;
    }
    catch (error) {
      return defaultResult;
    }
  }

  public getViewPathsFromViewRoot(viewRoot: IViewRoot): string[] {
    return Object.keys(viewRoot.columns);
  }

  public hasViewJson(table: string): boolean {
    const viewJsonPath = join(this.gitDatabase.fullPath, table, 'view.json');
    return existsSync(viewJsonPath);
  }

  public async init() {
    await this.gitDatabase.ensureCheckedOutLatest();
    this.mongo = await connect(environment.mongo.uri);
    await this.index.init();
  }

  public static async new(): Promise<GitDB> {
    const gitDatabase = new GitOperations(environment.gitdb);
    const gitDb = new GitDB(gitDatabase);
    await gitDb.init();
    return gitDb;
  }
}
