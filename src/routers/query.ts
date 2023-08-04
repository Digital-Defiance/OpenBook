import express from 'express';
import { OutputFormat } from '../enumerations/outputFormat';
import { GitDBIndex } from '../database/gitdb-index';
import { environment } from '../environment';

export function getQueryRouter(gitDbIndex: GitDBIndex) {
  const queryRouter = express.Router();

  queryRouter.get('/excluded-files', async (req, res) => {
    return res.send(environment.gitdb.excludeFiles);
  });

  queryRouter.get('/tables', async (req, res) => {
    try {
      const tables = await gitDbIndex.getTables();
      res.send({ tables });
    } catch (error) {
      res.status(500).send({ error: `Error occurred: ${error.message}` });
    }
  });

  queryRouter.get('/tables/:table', async (req, res) => {
    const table = req.params.table;
    try {
      const files = await gitDbIndex.getTableFiles(table);
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
          content = await gitDbIndex.getTableFileIndexHtml(table, file);
          break;
        case OutputFormat.Json:
          content = JSON.stringify(
            await gitDbIndex.getTableFileIndexRoot(table, file)
          );
          break;
        case OutputFormat.Markdown:
          content = await gitDbIndex.getTableFileIndexMarkdown(table, file);
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
