import { Router } from 'express';
import {
  createPTYSSLocalRoute,
  deletePTYSSLocalRoute,
  getAllPTYSSLocalRoutes,
  updatePTYSSLocalRoute,
  associateClientToRouteSet,
  disassociateClientFromRouteSet,
  createRouteSchema,
  deleteRouteSchema,
  getSchemaSummary,
} from '../controllers/ptyssLocalRoutesControllers/ptyssLocalRoutesControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrOperations } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');
const router = Router();

// Gestión de esquemas
router.get('/schemas/summary', jwtUtils, requireAdminOrOperations, catchedAsync(getSchemaSummary));
router.post('/schemas', jwtUtils, requireAdminOrOperations, catchedAsync(createRouteSchema));
router.delete('/schemas/:schemaName', jwtUtils, requireAdminOrOperations, catchedAsync(deleteRouteSchema));

// Rutas PTYSS Local Routes
router.get('/', jwtUtils, requireAdminOrOperations, catchedAsync(getAllPTYSSLocalRoutes));
router.post('/', jwtUtils, requireAdminOrOperations, catchedAsync(createPTYSSLocalRoute));
router.put('/:id', jwtUtils, requireAdminOrOperations, catchedAsync(updatePTYSSLocalRoute));
router.delete('/:id', jwtUtils, requireAdminOrOperations, catchedAsync(deletePTYSSLocalRoute));

// Asociación y desasociación de clientes reales a esquemas de rutas
router.post('/associate-client', jwtUtils, requireAdminOrOperations, catchedAsync(associateClientToRouteSet));
router.post('/disassociate-client', jwtUtils, requireAdminOrOperations, catchedAsync(disassociateClientFromRouteSet));

export default router; 