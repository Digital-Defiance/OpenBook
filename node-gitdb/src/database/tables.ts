import { readdirSync, statSync } from "fs";
import { join } from "path";
import { databasePath, getSimpleGit } from "./git";

/**
 * Get a list of all tables in the database
 * @returns a list of all tables in the database
 */
export function getTables(): string[] {
    const tables = readdirSync(databasePath);
    return tables.filter(table => !table.startsWith('.'));
}

/**
 * Recurse into the specified table and return a list of all files
 */
export function getTableFiles(table: string): string[] {
    console.log(`Getting files in table: ${table}`)
    const tablePath = join(databasePath, table);
    const files = readdirSync(tablePath);
    const returnedFiles: string[] = [];
    files.forEach(file => {
        if (file.startsWith('.')) {
            return;
        }
        const fullPath = join(tablePath, file);
        const relativePath = join(table, file);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
            returnedFiles.push(...getTableFiles(relativePath));
        } else {
            returnedFiles.push(relativePath);
        }
    });
    return returnedFiles;
}

/**
 * Recurse into the specified table and return a list of files changed since the given revision
 */
export function getChangedTableFiles(table: string, revision: string): string[] {
    console.log(`Checking for changes in table: ${table}`);
    const git = getSimpleGit();
    const tablePath = join(databasePath, table);
    const files = readdirSync(tablePath);
    const returnedFiles: string[] = [];
    files.forEach(file => {
        if (file.startsWith('.')) {
            return;
        }
        const fullPath = join(tablePath, file);
        const relativePath = join(table, file);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
            returnedFiles.push(...getChangedTableFiles(relativePath, revision));
        } else {
            const diff = git.diff([`${revision}..HEAD`, fullPath]);
            console.log(diff);
            // if (diff.length > 0) {
            //     returnedFiles.push(`${table}/${file}`);
            // }
        }
    });
    return returnedFiles;
}