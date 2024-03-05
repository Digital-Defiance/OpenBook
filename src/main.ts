import express from 'express';
import { getRouter as getTablesRouter } from './routers/tables';
import { getRouter as getViewRouter } from './routers/view';
import { environment } from './environment';
import { GitDB } from './core/gitdb';
import { getModels } from './core/mongo';

const app = express();

app.use(express.json());

(async function () {
  await getModels();
  await (async () => {
    try {
      console.log('Loading GitDB');
      const gitDb = await GitDB.new();
      console.log('Refreshing and updating indices');
      await gitDb.index.determineChangesAndUpdateIncices();
      console.log('Starting server');
      app.use('/tables', getTablesRouter(gitDb));
      app.use('/views', getViewRouter(gitDb));
      app.listen(environment.port, environment.host, () => {
        console.log(`[ ready ] http://${environment.host}:${environment.port}`);
      });
    } catch (error) {
      console.error('Error initializing server: ', error);
    }
  })();
})();
