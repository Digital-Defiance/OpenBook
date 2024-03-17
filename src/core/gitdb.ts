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

  /**
   * Sorts two strings alphabetically with special handling for specific markers, date patterns, and numerical values.
   *
   * This method prioritizes the '_top.md' file to always come first and the '_bottom.md' file to always come last.
   * For strings that are not special markers, it first attempts to sort based on any embedded date strings,
   * supporting 'YYYY-MM-DD' and 'MM-DD-YYYY' formats, with valid dates being sorted chronologically.
   *
   * If dates are identical, not present, or not valid, the method then looks at the textual content (if any) following
   * the date and before the last number for sorting. This ensures that strings with the same date but different
   * subsequent text are ordered alphabetically based on that text.
   *
   * After comparing text, the method compares the last number found in each string, if any. Strings containing numbers
   * are ordered numerically based on the last number. This comparison is applied to strings without identifiable dates,
   * or to strings with dates followed by additional numeric information.
   *
   * If neither string contains a date or if dates and subsequent text and numbers are identical, or in cases where
   * strings do not contain numbers, the strings are sorted alphabetically using `localeCompare`. This serves as the
   * final tiebreaker, ensuring that strings are sorted in a standard alphabetical order barring any prior criteria.
   *
   * @param {string} a The first string to compare.
   * @param {string} b The second string to compare.
   * @returns {number} A number indicating the sort order. Negative if `a` should come before `b`, positive if `a`
   * should come after `b`, and zero if they are considered equivalent in sort order.
   */
  public static alphaSort(a: string, b: string): number {
    // Special markers handling
    if (a === '_top.md') return -1;
    if (b === '_top.md') return 1;
    if (a === '_bottom.md') return 1;
    if (b === '_bottom.md') return -1;

    // Date extraction and comparison
    const extractDate = (str: string) => {
      const dateMatch = str.match(/(\d{4}-\d{2}-\d{2})|(\d{2}-\d{2}-\d{4})/);
      return dateMatch
        ? moment(dateMatch[0], ['YYYY-MM-DD', 'MM-DD-YYYY'])
        : null;
    };

    const aDate = extractDate(a),
      bDate = extractDate(b);
    if (aDate && bDate && aDate.isValid() && bDate.isValid()) {
      const dateDiff = aDate.diff(bDate);
      if (dateDiff !== 0) return dateDiff < 0 ? -1 : 1;
    }

    // Number extraction and comparison
    const extractLastNumber = (str: string) => {
      const numberMatch = str.match(/\d+(?!.*\d)/);
      return numberMatch ? parseInt(numberMatch[0], 10) : null;
    };

    const aNumber = extractLastNumber(
        a.replace(/(\d{4}-\d{2}-\d{2})|(\d{2}-\d{2}-\d{4})/, '')
      ),
      bNumber = extractLastNumber(
        b.replace(/(\d{4}-\d{2}-\d{2})|(\d{2}-\d{2}-\d{4})/, '')
      );
    if (aNumber !== null && bNumber !== null && aNumber !== bNumber)
      return aNumber - bNumber;

    // Alphabetical comparison as a fallback
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
    files.sort((a: string, b: string) => GitDB.alphaSort(a, b));
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
    tables.sort((a: string, b: string) => a.localeCompare(b));
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
      columns: {},
    };
    if (!this.hasViewJson(table)) {
      return defaultResult;
    }
    const viewJsonPath = join(this.gitDatabase.fullPath, table, 'view.json');
    const viewJsonString = readFileSync(viewJsonPath, 'utf-8');
    try {
      const viewJson = JSON.parse(viewJsonString) as IViewRoot;
      return viewJson;
    } catch (error) {
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

  public async pullLatest(): Promise<boolean> {
    return await this.gitDatabase.pullLatest();
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
