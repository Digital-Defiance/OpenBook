import express from 'express';
import { getRouter as getTablesRouter } from './routers/tables';
import { getRouter as getViewRouter } from './routers/view';
import { environment } from './environment';
import { GitDB } from './core/gitdb';
import { getModels } from './core/mongo';

const app = express();

app.use(express.json());

async function gitPullLatest(gitDb: GitDB) {
  const changesPresent = await gitDb.pullLatest();
  if (changesPresent) {
    console.log('Refreshing and updating indices');
    await gitDb.index.determineChangesAndUpdateIncices();
  }
}

(async function () {
  await getModels();
  await (async () => {
    try {
      console.log('Loading GitDB');
      const gitDb = await GitDB.new();
      const defaultInterval = 300000;
      const gitDbUpdateInterval = process.env.GIT_UPDATE_INTERVAL ? parseInt(process.env.GIT_UPDATE_INTERVAL, 10) : defaultInterval ?? defaultInterval;
      if (gitDbUpdateInterval < 0 || isNaN(gitDbUpdateInterval)) {
        throw new Error('Invalid git update interval');
      }
      console.log(`Setting up git pulls at ${gitDbUpdateInterval} interval`)
      setInterval(() => {
        (async () => {
          await gitPullLatest(gitDb);
        });
      }, gitDbUpdateInterval);
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
