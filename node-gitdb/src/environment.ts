import 'dotenv/config';
import { IEnvironment } from "./interfaces/environment";

export const environment: IEnvironment = {
    production: process.env.NODE_ENV === 'production',
    host: process.env.HOST ?? 'localhost',
    port: Number(process.env.PORT ?? 3000),
    database: {
        mountPoint: process.env.DATABASE_MOUNTPOINT ?? '/tmp/node-gitdb',
        repo: process.env.DATABASE_REPO ?? '',
        branch: process.env.DATABASE_BRANCH ?? 'main',
        path: process.env.DATABASE_PATH ?? '/',
    },
    index: {
        file: process.env.INDEX_FILE ?? 'index.json',
        path: process.env.INDEX_PATH ?? '/.gitdb-index',
    },
    mongo: {
        uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017',
        dbName: process.env.MONGO_DBNAME ?? 'node-gitdb',
        collectionName: process.env.MONGO_COLLECTION ?? 'gitdb',
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

if (environment.database.repo === '') {
    throw new Error('Invalid database repo');
}

const validGitRepoRegex = /^(?:https?|git)(?::\/\/|@)?(?:[^:/\s]+[/])?(?:[^\s/]+[/])?(?:[^/\s]+[/])?(?:[^/\s]+)$/;

if (!validGitRepoRegex.test(environment.database.repo)) {
    throw new Error('Invalid database repo');
}