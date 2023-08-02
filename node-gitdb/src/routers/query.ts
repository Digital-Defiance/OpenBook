import express from 'express';
import { OutputFormat } from '../enumerations/outputFormat';
import { GitDBIndex } from 'src/database/gitdb-index';

export function getQueryRouter(gitDbIndex: GitDBIndex) {
  const queryRouter = express.Router();

  queryRouter.get('/tables', async (req, res) => {
    try {
      const tables = await gitDbIndex.getTables();
      res.send({ tables });
    } catch (error) {
      res.status(500).send({ error: `Error occurred: ${error.message}` });
    }
  });

  queryRouter.get('/:table/:file/:format', async (req, res) => {
    const { table, file } = req.params;
    const format: string = req.params.format.toLowerCase();

    if (!(format in OutputFormat)) {
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
