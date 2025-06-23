import createRecord from "./createRecord";
import createTruckingRecords from "./createTruckingRecords";
import getAllRecords from "./getAllRecords";
import getRecordById from "./getRecordById";
import updateRecord from "./updateRecord";
import deleteRecord from "./deleteRecord";
import getRecordsByModule from "./getRecordsByModule";
import getRecordsByStatus from "./getRecordsByStatus";

const recordsControllers = {
  createRecord,
  createTruckingRecords,
  getAllRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
  getRecordsByModule,
  getRecordsByStatus
};

export default recordsControllers;