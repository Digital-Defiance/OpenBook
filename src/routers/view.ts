import { Router } from 'express';
import { GitDB } from '../database/gitdb';

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

  viewRouter.get('/:table/paths/:path', async (req, res) => {
    const table = req.params.table;
    const path = req.params.path;
    if (!gitDb.hasViewJson(table)) {
      res.status(404).send({ error: `Table ${table} does not exist` });
      return;
    }
    const aggregate = await gitDb.index.getAggregateQueryResponse(table, path);
    res.send(aggregate);
  });

  return viewRouter;
}