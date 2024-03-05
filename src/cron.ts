import { GitDB } from './core/gitdb';
import { getModels } from './core/mongo';


(async function () {
  await getModels();
  await (async () => {
    try {
      console.log('Loading GitDB');
      const gitDb = await GitDB.new();
      console.log('Refreshing and updating indices');
      await gitDb.index.determineChangesAndUpdateIncices();
    } catch (error) {
        console.error('Error running cron: ', error);
    }
  })();
})();
