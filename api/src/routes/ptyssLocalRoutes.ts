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
import { requireAdminOrOperations, requireShipchandlerModule, requireAnyRole } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');
const router = Router();

// Gestión de esquemas - permitir lectura a todos con módulo, escritura solo admin/operaciones
router.get('/schemas/summary', jwtUtils, requireShipchandlerModule, catchedAsync(getSchemaSummary));
router.post('/schemas', jwtUtils, requireShipchandlerModule, requireAdminOrOperations, catchedAsync(createRouteSchema));
router.delete('/schemas/:schemaName', jwtUtils, requireShipchandlerModule, requireAdminOrOperations, catchedAsync(deleteRouteSchema));

// Rutas PTYSS Local Routes - permitir lectura a todos con módulo, escritura a cualquier rol autorizado
router.get('/', jwtUtils, requireShipchandlerModule, catchedAsync(getAllPTYSSLocalRoutes));
router.post('/', jwtUtils, requireShipchandlerModule, requireAnyRole, catchedAsync(createPTYSSLocalRoute));
router.put('/:id', jwtUtils, requireShipchandlerModule, requireAnyRole, catchedAsync(updatePTYSSLocalRoute));
router.delete('/:id', jwtUtils, requireShipchandlerModule, requireAdminOrOperations, catchedAsync(deletePTYSSLocalRoute));

// Asociación y desasociación de clientes reales a esquemas de rutas - solo admin/operaciones
router.post('/associate-client', jwtUtils, requireShipchandlerModule, requireAdminOrOperations, catchedAsync(associateClientToRouteSet));
router.post('/disassociate-client', jwtUtils, requireShipchandlerModule, requireAdminOrOperations, catchedAsync(disassociateClientFromRouteSet));

export default router; 