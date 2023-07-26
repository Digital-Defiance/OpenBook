import express from 'express';
import 'dotenv/config';

import queryRouter from './routers/query';
import { ensureCheckedOutLatest } from './database/git';
import { updateIndiciesAndWriteRevision } from './database/indexing';
import { getTables } from './database/tables';
import { environment } from './environment';

(async function() {
    try {
        await ensureCheckedOutLatest();
        const tables = getTables();
        console.log(`[ ready ] Tables: ${tables.join(', ')}`);
        await updateIndiciesAndWriteRevision();
        const app = express();

        app.use(express.json());
        app.use('/query', queryRouter);

        app.listen(environment.port, environment.host, () => {
            console.log(`[ ready ] http://${environment.host}:${environment.port}`);
        });
    } catch (error) {
        console.error('Error initializing server: ', error);
    }
})();