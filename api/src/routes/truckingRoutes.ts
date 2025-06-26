import { Router } from 'express';
import truckingRoutesControllers from '../controllers/truckingRoutesControllers/truckingRoutesControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrOperations } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');
const router = Router();

// CRUD
router.get('/', jwtUtils, requireAdminOrOperations, catchedAsync(truckingRoutesControllers.getAllTruckingRoutes));
router.get('/:id', jwtUtils, requireAdminOrOperations, catchedAsync(truckingRoutesControllers.getTruckingRouteById));
router.post('/', jwtUtils, requireAdminOrOperations, catchedAsync(truckingRoutesControllers.createTruckingRoute));
router.put('/:id', jwtUtils, requireAdminOrOperations, catchedAsync(truckingRoutesControllers.updateTruckingRoute));
router.delete('/:id', jwtUtils, requireAdminOrOperations, catchedAsync(truckingRoutesControllers.deleteTruckingRoute));

export default router; 