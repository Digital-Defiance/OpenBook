import { createHash, Hash } from 'crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { IIndexRoot } from '../interfaces/indexRoot';
import { join } from 'path';
import { GitDB } from './gitdb';

export class GitDBIndex {
    public readonly gitDB: GitDB;
    public static readonly indexingVersion = '0.0.0';
    public static readonly indexFile = 'index.json';
    private readonly tableRoots = new Map<string, object>();

    constructor(gitDb: GitDB) {
        this.gitDB = gitDb;
    }

    public async init(): Promise<void> {
        console.log("Reading existing indices");
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
        const indexFilePath = join(this.gitDB.gitIndex.fullPath, GitDBIndex.indexFile);
        if (!existsSync(indexFilePath)) {
            return null;
        }
        try {
            const index = JSON.parse(readFileSync(indexFilePath, 'utf-8'));
            return index.hash || null;
        } catch (error) {
            console.error("Failed to parse JSON from index file: ", error);
            throw error;
        }
    }

    /**
     * Based on the current revision of the database and the index, determine what has changed
     * and return a list of changed tables. If the index does not exist, return all tables.
     */
    public async determineIndexChanges(): Promise<string[]> {
        console.log("Determining index changes");
        const existingIndexHash = await this.determineIndexHash();
        const currentDatabaseRevision = await this.gitDB.gitDatabase.getCurrentRevision();

        // If there is no existing index, return all files
        if (!existingIndexHash) {
            console.log("No existing index, returning all files");
            return this.gitDB.getTables();
        }

        // If the current revision and the existing index hash are the same,
        // there are no changes
        if (existingIndexHash === currentDatabaseRevision) {
            return [];
        }

        // If the current revision and the existing index hash are different,
        // determine and return the changes
        return this.gitDB.getChangedTables(existingIndexHash, currentDatabaseRevision);
    }

    public async readIndexFile(table: string): Promise<boolean> {
        const indexFilePath = join(this.gitDB.gitIndex.fullPath, table, GitDBIndex.indexFile);
        if (!existsSync(indexFilePath)) {
           return false;
        }
        const indexData = readFileSync(indexFilePath, 'utf-8');
        const index = JSON.parse(indexData);
        this.tableRoots.set(table, index);
        return true;
    }

    public async indexTableFile(table: string, file: string): Promise<object> {
        /* Use remark to parse the index file and output a record object */
        const tableFilePath = join(this.gitDB.gitDatabase.fullPath, table, file);
        if (!existsSync(tableFilePath)) {
            throw new Error(`Table file does not exist: ${tableFilePath}`);
        }
        const tableData = readFileSync(tableFilePath, 'utf-8'); 
        const remarkImport = await import('remark');
        const remarkGfmImport = await import('remark-gfm');
        const result = remarkImport.remark().use(remarkGfmImport.default).parse(tableData);
        this.tableRoots.set(table, result);
        console.log(result);
        return result;
    }

    public async updateIndicies(changedTables: string[]): Promise<void> {
        console.log("Updating indicies");
        // Initialize a map to store the hashes of each table
        const tableHashes: Map<string, string> = new Map();
    
        // Loop through each of the changed tables
        for (const table of changedTables) {
            console.log(`Processing table: ${table}`);
    
            // Initialize a new hash for this table
            const hash = createHash('sha256');
    
            // Get the list of files for this table
            const files = this.gitDB.getTableFiles(table);
    
            // Initialize an array to store the records for this table
            const tableRecords: object[] = [];
    
            // Loop through each of the files in the table
            for (const file of files) {
                console.log(`Processing file: ${file}`);
    
                // Update the hash with the contents of the file
                const filePath = join(this.gitDB.gitDatabase.fullPath, table, file);
                await this.updateHashWithFile(hash, filePath);
    
                // Parse the file and add its contents to the table records
                const record = await this.indexTableFile(table, file);
                tableRecords.push(record);
            }
    
            // Finalize the hash and store it in the map
            const tableHash = hash.digest('hex');
            console.log(`Finished processing table: ${table}, hash: ${tableHash}`);
            tableHashes.set(table, tableHash);
    
            // Write the table records and hash to the index
            await this.writeTableToIndex(table, tableRecords, tableHash);
        }
    }

    private async writeTableToIndex(table: string, records: object[], hash: string): Promise<void> {
        console.log(`Writing table to index: ${table}`);
    
        // Ensure the directory for the table exists in the index
        const indexTablePath = join(this.gitDB.gitIndex.fullPath, table);
        if (!existsSync(indexTablePath)) {
            console.log(`Creating directory for table in index: ${table}`);
            mkdirSync(indexTablePath, { recursive: true });
        }
    
        // Write the records and hash for the table to a file in the index
        const indexFilePath = join(indexTablePath, GitDBIndex.indexFile);
        const data = { records, hash };
        writeFileSync(indexFilePath, JSON.stringify(data));
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
        console.log("Getting DB revision in preperation for writing index revision");
        const index: IIndexRoot = {
            database: await this.gitDB.gitDatabase.getCurrentRevision(),
            last_index: await this.gitDB.gitIndex.getCurrentRevision(),
            version: GitDBIndex.indexingVersion
        };
        console.log(`Writing index revision to ${this.gitDB.gitIndex.fullPath}`);
        if (!existsSync(this.gitDB.gitIndex.fullPath)) {
            console.log(`Creating index directory ${this.gitDB.gitIndex.fullPath}`);
            mkdirSync(this.gitDB.gitIndex.fullPath, { recursive: true });
        }
        const indexFilePath = join(this.gitDB.gitIndex.fullPath, GitDBIndex.indexFile);
        writeFileSync(indexFilePath, JSON.stringify(index));
    }

    public async updateIndiciesAndWriteRevision(): Promise<void> {
        console.log("Updating indicies and writing revision");
        const changes = await this.determineIndexChanges();
        console.log(`Changes: ${changes.join(', ')}`);
        this.updateIndicies(changes);
        await this.writeIndexRevision();
    }
}