import uploadExcelFile from "./uploadExcelFile";
import getAllExcelFiles from "./getAllExcelFiles";
import getExcelFileById from "./getExcelFileById";
import deleteExcelFile from "./deleteExcelFile";
import getExcelFilesByModule from "./getExcelFilesByModule";
import getExcelFilesByStatus from "./getExcelFilesByStatus";
import processExcelFile from "./processExcelFile";

const excelFilesControllers = {
  uploadExcelFile,
  getAllExcelFiles,
  getExcelFileById,
  deleteExcelFile,
  getExcelFilesByModule,
  getExcelFilesByStatus,
  processExcelFile
};

export default excelFilesControllers;