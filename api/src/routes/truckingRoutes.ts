import { Router } from 'express';
import truckingRoutesControllers from '../controllers/truckingRoutesControllers/truckingRoutesControllers';
import importTruckingRoutes from '../controllers/truckingRoutesControllers/importTruckingRoutes';
import exportTruckingRoutes from '../controllers/truckingRoutesControllers/exportTruckingRoutes';
import debugImport from '../controllers/truckingRoutesControllers/debugImport';
import clearTruckingRoutes from '../controllers/truckingRoutesControllers/clearTruckingRoutes';
import fixIndexes from '../controllers/truckingRoutesControllers/fixIndexes';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrOperations, requireTruckingModule, requireAnyRole } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');
const router = Router();

// Rutas específicas (deben ir antes de las rutas con parámetros) - solo admin/operaciones
router.post('/import', jwtUtils, requireTruckingModule, requireAdminOrOperations, catchedAsync(importTruckingRoutes));
router.get('/export', jwtUtils, requireTruckingModule, requireAdminOrOperations, catchedAsync(exportTruckingRoutes));
router.post('/debug-import', jwtUtils, requireTruckingModule, requireAdminOrOperations, catchedAsync(debugImport));
router.post('/fix-indexes', jwtUtils, requireTruckingModule, requireAdminOrOperations, catchedAsync(fixIndexes));
router.delete('/clear', jwtUtils, requireTruckingModule, requireAdminOrOperations, catchedAsync(clearTruckingRoutes));

// CRUD (rutas con parámetros van al final) - lectura para todos, escritura según rol
router.get('/', jwtUtils, requireTruckingModule, catchedAsync(truckingRoutesControllers.getAllTruckingRoutes));
router.get('/:id', jwtUtils, requireTruckingModule, catchedAsync(truckingRoutesControllers.getTruckingRouteById));
router.post('/', jwtUtils, requireTruckingModule, requireAnyRole, catchedAsync(truckingRoutesControllers.createTruckingRoute));
router.put('/:id', jwtUtils, requireTruckingModule, requireAnyRole, catchedAsync(truckingRoutesControllers.updateTruckingRoute));
router.delete('/:id', jwtUtils, requireTruckingModule, requireAdminOrOperations, catchedAsync(truckingRoutesControllers.deleteTruckingRoute));

export default router; 