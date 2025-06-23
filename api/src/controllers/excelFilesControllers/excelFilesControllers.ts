import uploadExcelFile from "./uploadExcelFile";
import getAllExcelFiles from "./getAllExcelFiles";
import getExcelFileById from "./getExcelFileById";
import deleteExcelFile from "./deleteExcelFile";
import getExcelFilesByModule from "./getExcelFilesByModule";
import getExcelFilesByStatus from "./getExcelFilesByStatus";

const excelFilesControllers = {
  uploadExcelFile,
  getAllExcelFiles,
  getExcelFileById,
  deleteExcelFile,
  getExcelFilesByModule,
  getExcelFilesByStatus,
};

export default excelFilesControllers;