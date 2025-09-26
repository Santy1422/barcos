import createRecord from "./createRecord";
import createTruckingRecords from "./createTruckingRecords";
import createPTYSSRecords from "./createPTYSSRecords";
import createAgencyRecords from "./createAgencyRecords";
import getAllRecords from "./getAllRecords";
import getRecordById from "./getRecordById";
import updateRecord from "./updateRecord";
import deleteRecord from "./deleteRecord";
import getRecordsByModule from "./getRecordsByModule";
import getRecordsByStatus from "./getRecordsByStatus";
import getRecordsBySapCode from "./getRecordsBySapCode";

const recordsControllers = {
  createRecord,
  createTruckingRecords,
  createPTYSSRecords,
  createAgencyRecords,
  getAllRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
  getRecordsByModule,
  getRecordsByStatus,
  getRecordsBySapCode
};

export default recordsControllers;