import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { GitOperations } from './gitOperations';
import { GitDBIndex } from './gitdb-index';
import { environment } from '../environment';

export class GitDB {
  public readonly gitDatabase: GitOperations;
  public readonly index: GitDBIndex;

  constructor(gitDatabase: GitOperations) {
    this.gitDatabase = gitDatabase;
    this.index = new GitDBIndex(this);
  }

  public async init() {
    await this.gitDatabase.ensureCheckedOutLatest();
    await this.index.init();
  }

  /**
   * Get a list of all tables in the database
   * @returns a list of all tables in the database
   */
  public getTables(): string[] {
    const tables = readdirSync(this.gitDatabase.fullPath);
    return tables.filter((table) => !table.startsWith('.'));
  }

  /**
   * Recurse into the specified table and return a list of all files
   */
  public getTableFiles(table: string): string[] {
    console.log(`Getting files in table: ${table}`);
    const tablePath = join(this.gitDatabase.fullPath, table);
    const files = readdirSync(tablePath);
    const returnedFiles: string[] = [];
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
      } else {
        returnedFiles.push(file);
      }
    });
    return returnedFiles;
  }

  public async getChangedTables(
    table: string,
    revision: string
  ): Promise<string[]> {
    console.log(`Checking for changes in table: ${table}`);
    const git = this.gitDatabase.getSimpleGit();
    const tablePath = join(this.gitDatabase.fullPath, table);
    try {
      const diff = await git.diff([
        `${revision}..HEAD`,
        '--name-only',
        '--',
        tablePath,
      ]);
      if (diff.trim().length === 0) {
        console.log(`No changes in table: ${table}`);
        return [];
      } else {
        const changedFiles = diff
          .split('\n')
          .map((filePath) => filePath.replace(`${tablePath}/`, ''));
        return changedFiles;
      }
    } catch (error) {
      console.error(`Failed to get changes in table: ${table}`, error);
      throw error;
    }
  }

  public static async new(): Promise<GitDB> {
    const gitDatabase = new GitOperations(environment.database);
    const gitDb = new GitDB(gitDatabase);
    await gitDb.init();
    return gitDb;
  }
}
