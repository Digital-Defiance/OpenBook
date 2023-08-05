import express from 'express';
import { OutputFormat } from '../enumerations/outputFormat';
import { GitDB } from '../database/gitdb';

export function getQueryRouter(gitDb: GitDB) {
  const queryRouter = express.Router();

  
  queryRouter.get('/aggregate/:table', async (req, res) => {
    const table = req.params.table;
    const aggregates = gitDb.index.getAggregateNamesForTable(table);
    res.send(aggregates);
  });

  queryRouter.get('/aggregate/:table/:path', async (req, res) => {
    const table = req.params.table;
    const path = req.params.path;
    const aggregate = await gitDb.index.getAggregateForTable(table, path);
    res.send(aggregate);
  });

  queryRouter.get('/data/:table', async (req, res) => {
    const table = req.params.table;
    const indices = await gitDb.index.getTableFileIndices(table);
    const data = indices.map((index) => index.record);
    res.send({ table, data });
  });

  queryRouter.get('/tables', async (req, res) => {
    try {
      const tables = await gitDb.index.getTables();
      res.send({ tables });
    } catch (error) {
      res.status(500).send({ error: `Error occurred: ${error.message}` });
    }
  });

  queryRouter.get('/tables/:table', async (req, res) => {
    const table = req.params.table;
    const dataOnly: boolean = req.query.dataOnly === 'true';
    try {
      const files = await gitDb.index.getTableFiles(table);
      res.send({ table, files });
    } catch (error) {
      res.status(500).send({ error: `Error occurred: ${error.message}` });
    }
  });

  queryRouter.get('/tables/:table/:file', async (req, res) => {
    // get the values of OutputFormat and return as an array
    const values = Object.values(OutputFormat);
    res.json(values);
  });

  queryRouter.get('/tables/:table/:file/complete-json', async (req, res) => {
    const { table, file } = req.params;
    const index = await gitDb.index.getTableFileIndex(table, file);
    res.json(index);
  });

  queryRouter.get('/tables/:table/:file/:format', async (req, res) => {
    const { table, file } = req.params;
    const format: string = req.params.format.toLowerCase();
    const formats: string[] = Object.values(OutputFormat) as string[];
    if (!formats.includes(format)) {
      res.status(400).send({
        error: `Invalid format ${format}, should be 'html', 'json' or 'markdown'`,
      });
      return;
    }

    try {
      let content = null;
      switch (format) {
        case OutputFormat.Html:
          content = await gitDb.index.getTableFileIndexHtml(table, file);
          break;
        case OutputFormat.Json:
          content = JSON.stringify(
            await gitDb.index.getTableFileIndexRoot(table, file)
          );
          break;
        case OutputFormat.Markdown:
          content = await gitDb.index.getTableFileIndexMarkdown(table, file);
          break;
        default:
          res.status(500).send({ error: 'Unknown format' });
          return;
      }
      res.send({ table, file, content });
    } catch (error) {
      res.status(500).send({ error: `Error occurred: ${error.message}` });
    }
  });

  return queryRouter;
}
