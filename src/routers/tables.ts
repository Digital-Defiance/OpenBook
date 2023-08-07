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

  queryRouter.get('/:table/data', async (req, res) => {
    const table = req.params.table;
    const indices = await gitDb.index.getTableFileIndices(table);
    const data = indices.map((index) => index.record);
    res.send(data);
  });

  queryRouter.get('/:table/files', async (req, res) => {
    const table = req.params.table;
    const dataOnly: boolean = req.query.dataOnly === 'true';
    try {
      const files = await gitDb.index.getTableFiles(table, dataOnly);
      res.send(files);
    } catch (error) {
      res.status(500).send({ error: `Error occurred: ${error.message}` });
    }
  });

  queryRouter.get('/:table/files/:file', async (req, res) => {
    // get the values of OutputFormat and return as an array
    const values = Object.values(OutputFormat);
    res.json(values);
  });

  queryRouter.get('/:table/files/:file/json', async (req, res) => {
    const { table, file } = req.params;
    const content = JSON.stringify(
      await gitDb.index.getTableFileIndexRoot(table, file)
    );
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${file}.json`);
    res.send(content);
  });

  
  queryRouter.get('/:table/files/:file/html', async (req, res) => {
    const { table, file } = req.params;
    const content = await gitDb.index.getTableFileIndexHtml(table, file);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename=${file}.html`);
    res.send(content);
  });

  queryRouter.get('/:table/:file/markdown', async (req, res) => {
    const { table, file } = req.params;
    const content = await gitDb.index.getTableFileIndexMarkdown(table, file);
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename=${file}.md`);
    res.send(content);
  });

  queryRouter.get('/:table/paths', async (req, res) => {
    const table = req.params.table;
    const paths = await gitDb.index.getPathsForTable(table);
    res.send(paths);
  });

  queryRouter.get('/:table/paths/:path', async (req, res) => {
    const table = req.params.table;
    const path = req.params.path;
    const aggregate = await gitDb.index.getPathAggregateQueryResponse(table, path);
    res.send(aggregate);
  });

  return queryRouter;
}
