import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { connect } from 'mongoose';
import { join } from 'path';
import { GitOperations } from './gitOperations';
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
      } else {
        returnedFiles.push(file);
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

  public async getAggregateQueryResponse(table: string, path: string): Promise<IAggregateQueryResponse[]> {
    const aggregate: IFileNode[] = await this.index.getAggregateForTable(table, path);
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
    const viewData = await this.getViewJson(table);
    const paths = this.getViewPathsFromViewRoot(viewData);
    const aggregate = await this.index.getAggregateForTableByFile(table, paths);
    const response = this.buildViewFromViewRootAndAggregates(
      viewData,
      aggregate
    );
    return response;
  }

  public async getCondensedView(table: string): Promise<string[][]> {
    const viewData = await this.getViewJson(table);
    const paths = this.getViewPathsFromViewRoot(viewData);
    const aggregate = await this.index.getAggregateForTableByFile(table, paths);
    const response = this.buildViewFromViewRootAndAggregates(
      viewData,
      aggregate
    );
    return this.condenseViewResponse(viewData, response);
  }
}
