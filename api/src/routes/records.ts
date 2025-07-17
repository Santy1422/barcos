import { Router } from 'express';
import recordsControllers from '../controllers/recordsControllers/recordsControllers';
import { jwtUtils } from "../middlewares/jwtUtils";

const { catchedAsync } = require('../utils');

const router = Router();

// Crear registro
router.post('/', jwtUtils, catchedAsync(recordsControllers.createRecord));

// Crear múltiples registros de trucking desde Excel
router.post('/trucking/bulk', jwtUtils, catchedAsync(recordsControllers.createTruckingRecords));

// Crear múltiples registros de PTYSS desde entrada manual
router.post('/ptyss/bulk', jwtUtils, catchedAsync(recordsControllers.createPTYSSRecords));

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