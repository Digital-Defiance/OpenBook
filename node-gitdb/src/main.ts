import express from 'express';
import queryRouter from './routers/query';
import { environment } from './environment';
import { GitDB } from './database/gitdb';

const app = express();

app.use(express.json());
app.use('/query', queryRouter);

(async function() {
    try {
        console.log("Loading GitDB")
        const gitDb = await GitDB.new();
        console.log("Refreshing and updating indicies");
        await gitDb.index.updateIndiciesAndWriteRevision();
        console.log("Starting server")
        app.listen(environment.port, environment.host, () => {
            console.log(`[ ready ] http://${environment.host}:${environment.port}`);
        });
    } catch (error) {
        console.error('Error initializing server: ', error);
    }
})();