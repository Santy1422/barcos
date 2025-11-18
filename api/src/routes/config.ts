import { Router } from 'express';
import configControllers from '../controllers/configControllers/configControllers';
import { 
  createContainerType, 
  getAllContainerTypes, 
  updateContainerType, 
  deleteContainerType 
} from '../controllers/configControllers/containerTypesControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrOperations, requireAdminOrCatalogos, requireAdminOrCatalogosOrOperations } from '../middlewares/authorization';

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

// SAP Service Codes
router.get('/service-sap-codes', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.getServiceSapCodes));
router.post('/service-sap-codes', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.createServiceSapCode));
router.put('/service-sap-codes/:id', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.updateServiceSapCode));
router.delete('/service-sap-codes/:id', jwtUtils, requireAdminOrOperations, catchedAsync(configControllers.deleteServiceSapCode));

// Container Types
// Operaciones de lectura: permite admin, catalogos y operaciones
router.get('/container-types', jwtUtils, requireAdminOrCatalogosOrOperations, catchedAsync(getAllContainerTypes));
// Operaciones de escritura: solo admin o catalogos
router.post('/container-types', jwtUtils, requireAdminOrCatalogos, catchedAsync(createContainerType));
router.put('/container-types/:id', jwtUtils, requireAdminOrCatalogos, catchedAsync(updateContainerType));
router.delete('/container-types/:id', jwtUtils, requireAdminOrCatalogos, catchedAsync(deleteContainerType));

export default router;