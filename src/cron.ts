import { GitDB } from './database/gitdb';
import { getModels } from './database/mongo';


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
