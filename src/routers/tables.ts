import { Router } from 'express';
import { OutputFormat } from '../enumerations/outputFormat';
import { GitDB } from '../database/gitdb';

export function getRouter(gitDb: GitDB) {
  const queryRouter = Router();

  queryRouter.get('/', async (req, res) => {
    try {
      const tables = await gitDb.index.getTables();
      res.send(tables);
    } catch (error) {
      res.status(500).send({ error: `Error occurred: ${error.message}` });
    }
  });

  queryRouter.get('/data/:table', async (req, res) => {
    const table = req.params.table;
    const indices = await gitDb.index.getTableFileIndices(table);
    const data = indices.map((index) => index.record);
    res.send({ table, data });
  });

  queryRouter.get('/:table', async (req, res) => {
    const table = req.params.table;
    const dataOnly: boolean = req.query.dataOnly === 'true';
    try {
      const files = await gitDb.index.getTableFiles(table, dataOnly);
      res.send({ table, files });
    } catch (error) {
      res.status(500).send({ error: `Error occurred: ${error.message}` });
    }
  });

  queryRouter.get('/:table/:file', async (req, res) => {
    // get the values of OutputFormat and return as an array
    const values = Object.values(OutputFormat);
    res.json(values);
  });

  queryRouter.get('/:table/:file/json', async (req, res) => {
    const { table, file } = req.params;
    const content = JSON.stringify(
      await gitDb.index.getTableFileIndexRoot(table, file)
    );
    res.send({ table, file, content });
  });

  
  queryRouter.get('/:table/:file/html', async (req, res) => {
    const { table, file } = req.params;
    const content = await gitDb.index.getTableFileIndexHtml(table, file);
    res.send({ table, file, content });
  });

  queryRouter.get('/:table/:file/markdown', async (req, res) => {
    const { table, file } = req.params;
    const content = await gitDb.index.getTableFileIndexMarkdown(table, file);
    res.send({ table, file, content });
  });

  return queryRouter;
}
