import express from 'express';
import { getRouter as getExcelRouter } from './routers/excel';
import { getRouter as getTablesRouter } from './routers/tables';
import { getRouter as getViewRouter } from './routers/view';
import { environment } from './environment';
import { GitDB } from './database/gitdb';
import { getModels } from './database/mongo';

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
      app.use('/excel', getExcelRouter(gitDb));
      app.use('/tables', getTablesRouter(gitDb));
      app.use('/view', getViewRouter(gitDb));
      app.listen(environment.port, environment.host, () => {
        console.log(`[ ready ] http://${environment.host}:${environment.port}`);
      });
    } catch (error) {
      console.error('Error initializing server: ', error);
    }
  })();
})();
