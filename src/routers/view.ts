import { Router } from 'express';
import { GitDB } from '../core/gitdb';
import { GitDBExcel } from '../core/excel';
import { GitDBHtml } from '../core/html';

export function getRouter(gitDb: GitDB) {
  const viewRouter = Router();
  
  viewRouter.get('/:table', async (req, res) => {
    const table = req.params.table;
    if (!gitDb.hasViewJson(table)) {
      res.status(404);
      return;
    }
    try {
      const response = await gitDb.index.getRenderedView(table);
      res.send(response);
    } catch (error) {
      res.status(500).send({ error: `Error occurred: ${error.message}` });
    }
  });

  viewRouter.get('/:table/excel', async (req, res) => {
    const table = req.params.table;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `${table}.xlsx`
    );
    const excelBuffer = await GitDBExcel.getViewAsExcel(gitDb, table);
    res.send(excelBuffer);
  });

  viewRouter.get('/:table/html', async (req, res) => {
    const table = req.params.table;
    res.setHeader('Content-Type', 'text/html');
    const html = await GitDBHtml.getTableAsHtml(gitDb, table);
    res.send(html);
  });

  viewRouter.get('/:table/condensed', async (req, res) => {
    const table = req.params.table;
    if (!gitDb.hasViewJson(table)) {
      res.status(404);
      return;
    }
    try {
      const response = await gitDb.index.getCondensedView(table);
      res.send(response);
    } catch (error) {
      res.status(500).send({ error: `Error occurred: ${error.message}` });
    }
  });

  viewRouter.get('/:table/paths', async (req, res) => {
    const table = req.params.table;
    if (!gitDb.hasViewJson(table)) {
      res.status(404).send({ error: `Table ${table} does not exist` });
      return;
    }
    const viewRoot = gitDb.getViewJson(table);
    const aggregates = gitDb.getViewPathsFromViewRoot(viewRoot);
    res.send(aggregates);
  });

  return viewRouter;
}