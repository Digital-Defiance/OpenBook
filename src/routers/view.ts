import exceljs from 'exceljs';
import { Router } from 'express';
import { GitDB } from '../core/gitdb';

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
    const workbook = new exceljs.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true,
    });
    await gitDb.excel.getViewAsExcel(table, workbook);
    await workbook.commit();
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