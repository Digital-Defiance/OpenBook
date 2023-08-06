import exceljs from 'exceljs';
import { Router } from 'express';
import { GitDB } from '../database/gitdb';

export function getRouter(gitDb: GitDB) {
  const excelRouter = Router();
  excelRouter.get('/:table', async (req, res) => {
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
  return excelRouter;
}
