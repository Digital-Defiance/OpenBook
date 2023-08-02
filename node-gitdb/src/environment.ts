import dotenv from 'dotenv';
import { resolve } from 'path';
import { IEnvironment } from "./interfaces/environment";

dotenv.config({ path: resolve(__dirname, '../.env') });

export const environment: IEnvironment = {
    production: process.env.NODE_ENV === 'production',
    host: process.env.HOST ?? 'localhost',
    port: Number(process.env.PORT ?? 3000),
    gitdb: {
        mountPoint: process.env.GITDB_MOUNTPOINT ?? '/tmp/node-gitdb',
        repo: process.env.GITDB_REPO ?? '',
        repoRecursive: process.env.GITDB_REPO_RECURSIVE === 'true',
        branch: process.env.GITDB_BRANCH ?? 'main',
        path: process.env.GITDB_PATH ?? '/',
    },
    mongo: {
        uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017',
        dbName: process.env.MONGO_DBNAME ?? 'gitdb',
        collectionName: process.env.MONGO_COLLECTION ?? 'gitdb',
        indexCollectionName: process.env.MONGO_INDEX_COLLECTION ?? 'gitdb-index',
    }
};

if (environment.production) {
    console.log('[ ready ] Production mode');
}

if (!environment.host || environment.host === '') {
    throw new Error('Invalid host');
}

if (environment.port < 1 || environment.port > 65535) {
    throw new Error(`Invalid port: ${environment.port}`);
}

if (environment.gitdb.repo === '') {
    throw new Error('Invalid database repo');
}

const validGitRepoRegex = /^(?:https?|git)(?::\/\/|@)?(?:[^:/\s]+[/])?(?:[^\s/]+[/])?(?:[^/\s]+[/])?(?:[^/\s]+)$/;

if (!validGitRepoRegex.test(environment.gitdb.repo)) {
    throw new Error('Invalid database repo');
}