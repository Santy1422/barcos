import { Router } from 'express';
import configControllers from '../controllers/configControllers/configControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrOperations } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');
const router = Router();

router.get('/', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.getConfig));
router.put('/', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.updateConfig));

// Drivers
router.post('/drivers', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.createDriver));
router.put('/drivers/:id', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.updateDriver));
router.delete('/drivers/:id', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.deleteDriver));

// Vehicles
router.post('/vehicles', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.createVehicle));
router.put('/vehicles/:id', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.updateVehicle));
router.delete('/vehicles/:id', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.deleteVehicle));

// Routes
router.post('/routes', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.createRoute));
router.put('/routes/:id', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.updateRoute));
router.delete('/routes/:id', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.deleteRoute));

export default router;