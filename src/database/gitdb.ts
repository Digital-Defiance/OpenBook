import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { connect } from 'mongoose';
import { join } from 'path';
import { GitOperations } from './gitOperations';
import { GitDBExcel } from '../excel';
import { GitDBIndex } from './gitdb-index';
import { environment } from '../environment';
import { IAggregateResponse } from '../interfaces/aggregateResponse';
import { IAggregateQueryResponse } from '../interfaces/aggregateQueryResponse';
import { IFileNode } from '../interfaces/fileNode';
import { IViewResponse } from '../interfaces/viewResponse';
import { IViewRoot } from '../interfaces/viewRoot';

/**
 * GitDB is the Git-based on-disk component of node-gitdb. It is responsible for
 * checking out the git repository containing the markdown formatted database
 * and providing methods to index (into mongo) and query the database.
 *
 * GitDB refers to the on-disk part, and GitDBIndex refers to the mongo index.
 */
export class GitDB {
  public readonly gitDatabase: GitOperations;
  public readonly index: GitDBIndex;
  public readonly excel: GitDBExcel;
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
    this.excel = new GitDBExcel(this);
  }

  public async getChangedFiles(sinceRevision: string): Promise<string[]> {
    return await this.gitDatabase.getChangedMarkdownFiles(sinceRevision);
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
    return tables.filter((table) => {
      const fullPath = join(this.gitDatabase.fullPath, table);
      return statSync(fullPath).isDirectory() && !table.startsWith('.');
    });
  }

  public getViewJson(table: string): IViewRoot {
    if (!this.hasViewJson(table)) {
      return {};
    }
    const viewJsonPath = join(this.gitDatabase.fullPath, table, 'view.json');
    const viewJsonString = readFileSync(viewJsonPath, 'utf-8');
    const viewJson = JSON.parse(viewJsonString) as IViewRoot;
    return viewJson;
  }

  public getViewPathsFromViewRoot(viewRoot: IViewRoot): string[] {
    return Object.keys(viewRoot);
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
