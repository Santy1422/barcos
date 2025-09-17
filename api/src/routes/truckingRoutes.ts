import { Router } from 'express';
import truckingRoutesControllers from '../controllers/truckingRoutesControllers/truckingRoutesControllers';
import importTruckingRoutes from '../controllers/truckingRoutesControllers/importTruckingRoutes';
import debugImport from '../controllers/truckingRoutesControllers/debugImport';
import clearTruckingRoutes from '../controllers/truckingRoutesControllers/clearTruckingRoutes';
import fixIndexes from '../controllers/truckingRoutesControllers/fixIndexes';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrOperations } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');
const router = Router();

// Rutas específicas (deben ir antes de las rutas con parámetros)
router.post('/import', jwtUtils, requireAdminOrOperations, catchedAsync(importTruckingRoutes));
router.post('/debug-import', jwtUtils, requireAdminOrOperations, catchedAsync(debugImport));
router.post('/fix-indexes', jwtUtils, requireAdminOrOperations, catchedAsync(fixIndexes));
router.delete('/clear', jwtUtils, requireAdminOrOperations, catchedAsync(clearTruckingRoutes));

// CRUD (rutas con parámetros van al final)
router.get('/', jwtUtils, requireAdminOrOperations, catchedAsync(truckingRoutesControllers.getAllTruckingRoutes));
router.get('/:id', jwtUtils, requireAdminOrOperations, catchedAsync(truckingRoutesControllers.getTruckingRouteById));
router.post('/', jwtUtils, requireAdminOrOperations, catchedAsync(truckingRoutesControllers.createTruckingRoute));
router.put('/:id', jwtUtils, requireAdminOrOperations, catchedAsync(truckingRoutesControllers.updateTruckingRoute));
router.delete('/:id', jwtUtils, requireAdminOrOperations, catchedAsync(truckingRoutesControllers.deleteTruckingRoute));

export default router; 