import express from 'express';
import queryRouter from './routers/query';
import { environment } from './environment';
import { GitDB } from './database/gitdb';
import { getModels } from './database/mongo';

const app = express();

app.use(express.json());
app.use('/query', queryRouter);

(async function () {
  await getModels();
  await (async () => {
    try {
      console.log('Loading GitDB');
      const gitDb = await GitDB.new();
      console.log('Refreshing and updating indices');
      await gitDb.index.determineChangesAndUpdateIncices();
      console.log('Starting server');
      app.listen(environment.port, environment.host, () => {
        console.log(`[ ready ] http://${environment.host}:${environment.port}`);
      });
    } catch (error) {
      console.error('Error initializing server: ', error);
    }
  })();
})();
