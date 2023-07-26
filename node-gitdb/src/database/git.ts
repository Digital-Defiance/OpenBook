import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

import { environment } from '../environment';

export const databasePath = join(environment.database.mountpoint, environment.database.path);
export const gitPath = join(environment.database.mountpoint, '.git');
export const gitConfigPath = join(gitPath, 'config');
export const mountParent = dirname(environment.database.mountpoint);
if (!existsSync(mountParent)) {
    throw new Error('Database mountpoint parent does not exist');
}

export function getSimpleGit(): SimpleGit {
    const options: Partial<SimpleGitOptions> = {
        baseDir: environment.database.mountpoint,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
     };
     
    return simpleGit(options);
}

export async function checkoutDatabaseBranch(): Promise<void> {
    console.log(`Checking out database branch: ${environment.database.branch}`);
    const git = getSimpleGit();
    try {
        await git.checkout(environment.database.branch);
    } catch (error) {
        console.error("Failed to checkout branch: ", error);
        throw error;
    }
}

/** Commit all changes to table */
export async function commitTable(table: string, message: string): Promise<void> {
    console.log(`Committing changes to table: ${table}`);
    const git = getSimpleGit();
    const tablePath = join(databasePath, table);
    try {
        await git.add(tablePath);
    }
    catch (error) {
        console.error("Failed to add changes to git: ", error);
        throw error;
    }
    try {
        await git.commit(message);
    }
    catch (error) {
        console.error("Failed to commit changes to git: ", error);
        throw error;
    }
}

export async function ensureCheckedOutLatest(): Promise<void> {
    console.log(`Ensuring database mountpoint exists at mountpoint: ${environment.database.mountpoint}`);
    if (existsSync(environment.database.mountpoint)) {
        console.log("[ ready ] Database mountpoint exists")
    } else {
        const mountpointParent = dirname(environment.database.mountpoint);
        if (!existsSync(mountpointParent)) {
            throw new Error('Database mountpoint parent does not exist');
        }
        console.log("[ ready ] Database mountpoint does not exist")
        console.log(`Cloning database repo from: ${environment.database.repo}`);
        try {
            const gitInstance = simpleGit();
            const result = await gitInstance.clone(environment.database.repo, environment.database.mountpoint);
            console.log(result);
        } catch (error) {
            console.error("Failed to clone repo: ", error);
            throw error;
        }
    }
    validateMountedRepo();
    await ensureDatabaseBranch();
    await pullLatest();
}

export async function ensureDatabaseBranch(): Promise<void> {
    console.log("Ensuring we are on the correct database branch");
    const currentBranchName = await getCurrentBranch();
    if (currentBranchName !== environment.database.branch) {
        await checkoutDatabaseBranch();
    } else {
        console.log("Already on correct branch");
    }
}

export async function getCurrentBranch() {
    console.log("Getting current branch");
    const git = getSimpleGit();
    try {
        const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
        return currentBranch;
    } catch (error) {
        console.error('Failed to get current branch: ', error);
        throw error;
    }
}

export async function getCurrentDatabaseRevision(): Promise<string> {
    // return the current git hash
    const git = getSimpleGit();
    const gitHash = await git.revparse(['HEAD']);
    console.log(`Current git hash: ${gitHash}`);
    return gitHash;
}

export async function pullLatest(): Promise<void> {
    console.log("Pulling latest database changes");
    const git = getSimpleGit();
    try {
        await git.pull();
    } catch (error) {
        console.error("Failed to pull changes: ", error);
        throw error;
    }
}

export function pushToOrigin(): void {
    console.log("Pushing changes to origin");
    const git = getSimpleGit();
    git.push();
}

export function validateMountedRepo(): void {
    console.log("Verifying database mountpoint is on the correct repo");
    if (!existsSync(gitPath)) {
        throw new Error('Database mountpoint exists but is not a git repository');
    }
    const gitConfig = readFileSync(gitConfigPath, 'utf-8');
    const gitConfigRegex = /\[remote "origin"\]\s+url = (.*)/g;
    const gitConfigMatch = gitConfigRegex.exec(gitConfig);
    if (gitConfigMatch === null) {
        throw new Error('Database mountpoint is not on the correct repo');
    }
}