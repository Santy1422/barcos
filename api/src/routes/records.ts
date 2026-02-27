import { Router } from 'express';
import recordsControllers from '../controllers/recordsControllers/recordsControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { createAutoridadesRecord } from '../controllers/recordsControllers/createAutoridadesRecord';
import { getAllAutoridadesRecords } from '../controllers/recordsControllers/getAllAutoridadesRecords';
import { deleteAutoridadesRecord } from '../controllers/recordsControllers/deleteAutoridadesRecord';
import { checkExistingAutoridadesRecords } from '../controllers/recordsControllers/checkExistingAutoridadesRecords';
import { resetAutoridadesRecords } from '../controllers/recordsControllers/resetAutoridadesRecords';
import recordsAutoridadesControllers from '../controllers/recordsControllers/recordsAutoridadesControllers';
import { requireShipchandlerModule, requirePtyssModule, requireAnyRole } from '../middlewares/authorization';
import createTruckingRecordsAsync from '../controllers/recordsControllers/createTruckingRecordsAsync';
import createPTYSSRecordsAsync from '../controllers/recordsControllers/createPTYSSRecordsAsync';
import createAgencyRecordsAsync from '../controllers/recordsControllers/createAgencyRecordsAsync';
import createShipChandlerRecordsAsync from '../controllers/recordsControllers/createShipChandlerRecordsAsync';
import { getJobStatus, getUserPendingJobs, getUserJobHistory } from '../controllers/recordsControllers/getUploadJobStatus';
import getRecordsByIds from '../controllers/recordsControllers/getRecordsByIds';

const { catchedAsync } = require('../utils');

const router = Router();

// Crear registro
router.post('/', jwtUtils, catchedAsync(recordsControllers.createRecord));

// Crear múltiples registros de trucking desde Excel (síncrono - legacy)
router.post('/trucking/bulk', jwtUtils, catchedAsync(recordsControllers.createTruckingRecords));

// Crear múltiples registros de trucking desde Excel (asíncrono - nuevo)
router.post('/trucking/bulk-async', jwtUtils, catchedAsync(createTruckingRecordsAsync));

// Jobs de upload - estado y historial
router.get('/jobs/pending', jwtUtils, catchedAsync(getUserPendingJobs));
router.get('/jobs/history', jwtUtils, catchedAsync(getUserJobHistory));
router.get('/jobs/:jobId', jwtUtils, catchedAsync(getJobStatus));

// Crear múltiples registros de PTYSS desde entrada manual (síncrono - legacy)
router.post('/ptyss/bulk', jwtUtils, requirePtyssModule, requireAnyRole, catchedAsync(recordsControllers.createPTYSSRecords));
// Crear múltiples registros de PTYSS (asíncrono - nuevo)
router.post('/ptyss/bulk-async', jwtUtils, requirePtyssModule, requireAnyRole, catchedAsync(createPTYSSRecordsAsync));

// Crear múltiples registros de Agency desde Excel o entrada manual (síncrono - legacy)
router.post('/agency/bulk', jwtUtils, catchedAsync(recordsControllers.createAgencyRecords));
// Crear múltiples registros de Agency (asíncrono - nuevo)
router.post('/agency/bulk-async', jwtUtils, catchedAsync(createAgencyRecordsAsync));

// Crear múltiples registros de ShipChandler desde Excel (síncrono - legacy)
router.post('/shipchandler/bulk', jwtUtils, requireShipchandlerModule, requireAnyRole, catchedAsync(recordsControllers.createShipChandlerRecords));
// Crear múltiples registros de ShipChandler (asíncrono - nuevo)
router.post('/shipchandler/bulk-async', jwtUtils, requireShipchandlerModule, requireAnyRole, catchedAsync(createShipChandlerRecordsAsync));

// Gastos Autoridades
router.post('/autoridades', jwtUtils, catchedAsync(recordsAutoridadesControllers.createAutoridadesRecord));
router.post('/autoridades/bulk', jwtUtils, catchedAsync(recordsAutoridadesControllers.createAutoridadesRecords));
router.post('/autoridades/check-existing', jwtUtils, catchedAsync(checkExistingAutoridadesRecords));
router.post('/autoridades/reset-status', jwtUtils, catchedAsync(resetAutoridadesRecords));
router.get('/autoridades', jwtUtils, catchedAsync(recordsAutoridadesControllers.getAllAutoridadesRecords));
router.put('/autoridades/:id', jwtUtils, catchedAsync(recordsAutoridadesControllers.updateAutoridadesRecord));
router.delete('/autoridades/:id', jwtUtils, catchedAsync(recordsAutoridadesControllers.deleteAutoridadesRecord));

// Obtener registros por array de IDs
router.post('/by-ids', jwtUtils, catchedAsync(getRecordsByIds));

// Obtener todos los registros
router.get('/', jwtUtils, catchedAsync(recordsControllers.getAllRecords));

// Obtener registros por módulo
router.get('/module/:module', jwtUtils, catchedAsync(recordsControllers.getRecordsByModule));

// Obtener registros por estado
router.get('/status/:status', catchedAsync(recordsControllers.getRecordsByStatus));

// Obtener registros por sapCode
router.get('/sapcode/:sapCode', jwtUtils, catchedAsync(recordsControllers.getRecordsBySapCode));

// Obtener registro por ID
router.get('/:id', jwtUtils, catchedAsync(recordsControllers.getRecordById));

// Actualizar registro
router.put('/:id', jwtUtils, catchedAsync(recordsControllers.updateRecord));

// Eliminar registro
router.delete('/:id', jwtUtils, catchedAsync(recordsControllers.deleteRecord));

export default router;