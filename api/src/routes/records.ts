import { Router } from 'express';
import recordsControllers from '../controllers/recordsControllers/recordsControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { createAutoridadesRecord } from '../controllers/recordsControllers/createAutoridadesRecord';
import { getAllAutoridadesRecords } from '../controllers/recordsControllers/getAllAutoridadesRecords';
import { deleteAutoridadesRecord } from '../controllers/recordsControllers/deleteAutoridadesRecord';
import recordsAutoridadesControllers from '../controllers/recordsControllers/recordsAutoridadesControllers';
import { requireShipchandlerModule, requirePtyssModule, requireAnyRole } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');

const router = Router();

// Crear registro
router.post('/', jwtUtils, catchedAsync(recordsControllers.createRecord));

// Crear múltiples registros de trucking desde Excel
router.post('/trucking/bulk', jwtUtils, catchedAsync(recordsControllers.createTruckingRecords));

// Crear múltiples registros de PTYSS desde entrada manual
router.post('/ptyss/bulk', jwtUtils, requirePtyssModule, requireAnyRole, catchedAsync(recordsControllers.createPTYSSRecords));

// Crear múltiples registros de Agency desde Excel o entrada manual
router.post('/agency/bulk', jwtUtils, catchedAsync(recordsControllers.createAgencyRecords));

// Crear múltiples registros de ShipChandler desde Excel
router.post('/shipchandler/bulk', jwtUtils, requireShipchandlerModule, requireAnyRole, catchedAsync(recordsControllers.createShipChandlerRecords));

// Gastos Autoridades
router.post('/autoridades', jwtUtils, catchedAsync(recordsAutoridadesControllers.createAutoridadesRecord));
router.post('/autoridades/bulk', jwtUtils, catchedAsync(recordsAutoridadesControllers.createAutoridadesRecords));
router.get('/autoridades', jwtUtils, catchedAsync(recordsAutoridadesControllers.getAllAutoridadesRecords));
router.put('/autoridades/:id', jwtUtils, catchedAsync(recordsAutoridadesControllers.updateAutoridadesRecord));
router.delete('/autoridades/:id', jwtUtils, catchedAsync(recordsAutoridadesControllers.deleteAutoridadesRecord));

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