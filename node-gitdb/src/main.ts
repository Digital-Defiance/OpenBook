import express from 'express';
import queryRouter from './routers/query';
import { environment } from './environment';
import { GitDB } from './database/gitdb';

(async function() {
    try {
        const gitDb = await GitDB.new();
        await gitDb.index.updateIndiciesAndWriteRevision();
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