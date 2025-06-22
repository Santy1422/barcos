import createRecord from "./createRecord";
import getAllRecords from "./getAllRecords";
import getRecordById from "./getRecordById";
import updateRecord from "./updateRecord";
import deleteRecord from "./deleteRecord";
import getRecordsByModule from "./getRecordsByModule";
import getRecordsByStatus from "./getRecordsByStatus";

const recordsControllers = {
  createRecord,
  getAllRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
  getRecordsByModule,
  getRecordsByStatus
};

export default recordsControllers;