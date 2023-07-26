import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { environment } from '../environment';
import { IIndexRoot } from '../interfaces/indexRoot';
import { getCurrentDatabaseRevision } from './git';
import { getChangedTableFiles, getTableFiles, getTables } from './tables';
import { join } from 'path';

export const indexingVersion = '0.0.0';
export const indexDirectory = '.gitdb-index';
export const indexFile = 'index.json';
export const indexPath = join(environment.database.mountpoint, indexDirectory)
export const indexFilePath = join(indexPath, indexFile);

/**
 * Look at the db mountpoint and see if indexDirectory exists
 * if it does, pull the index revision 
 */
export async function determineIndexHash() {
    if (!existsSync(`${environment.database.mountpoint}/${indexDirectory}`)) {
        return null;
    }
    const index = JSON.parse(readFileSync(`${environment.database.mountpoint}/${indexDirectory}/${indexFile}`, 'utf-8'));
    return index.hash || null;
}

/**
 * Based on the current revision of the database and the index, determine what has changed
 * and return a list of changed files. If the index does not exist, return all files.
 */
export async function determineIndexChanges(): Promise<string[]> {
    console.log("Determining index changes");
    const existingIndexHash = await determineIndexHash();
    const currentRevision = await getCurrentDatabaseRevision();

    // If there is no existing index, return all files
    if (!existingIndexHash) {
        console.log("No existing index, returning all files");
        const tables = getTables();
        const files = tables.reduce((files: string[], table: string) => {
            const tableFiles = getTableFiles(table);
            return [...files, ...tableFiles];
        }, []);
        return files;
    }

    // If the current revision and the existing index hash are the same,
    // there are no changes
    if (existingIndexHash === currentRevision) {
        return [];
    }

    // If the current revision and the existing index hash are different,
    // determine and return the changes
    return getChangedTableFiles(existingIndexHash, currentRevision);
}

export function updateIndicies(): void {
    console.log("Updating indicies");
}

/**
 * Write the current revision of the database to the index
 */
export async function writeIndexRevision(): Promise<void> {
    console.log("Getting DB revision in preperation for writing index revision");
    const currentRevision = await getCurrentDatabaseRevision();
    const index: IIndexRoot = {
        hash: currentRevision,
        version: indexingVersion
    };
    console.log(`Writing index revision to ${indexFilePath}`);
    if (!existsSync(indexPath)) {
        console.log(`Creating index directory ${indexPath}`);
        mkdirSync(indexPath);
    }
    writeFileSync(indexFilePath, JSON.stringify(index));
}

export async function updateIndiciesAndWriteRevision(): Promise<void> {
    console.log("Updating indicies and writing revision");
    const changes = await determineIndexChanges();
    console.log(`Changes: ${changes.join(', ')}`);
    updateIndicies();
    await writeIndexRevision();
}