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
import { requireAdminOrOperations, requirePtyssModule, requireAnyRole } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');
const router = Router();

// Gestión de esquemas - permitir lectura a todos con módulo, escritura solo admin/operaciones
router.get('/schemas/summary', jwtUtils, requirePtyssModule, catchedAsync(getSchemaSummary));
router.post('/schemas', jwtUtils, requirePtyssModule, requireAdminOrOperations, catchedAsync(createRouteSchema));
router.delete('/schemas/:schemaName', jwtUtils, requirePtyssModule, requireAdminOrOperations, catchedAsync(deleteRouteSchema));

// Rutas PTYSS Local Routes - permitir lectura a todos con módulo, escritura a cualquier rol autorizado
router.get('/', jwtUtils, requirePtyssModule, catchedAsync(getAllPTYSSLocalRoutes));
router.post('/', jwtUtils, requirePtyssModule, requireAnyRole, catchedAsync(createPTYSSLocalRoute));
router.put('/:id', jwtUtils, requirePtyssModule, requireAnyRole, catchedAsync(updatePTYSSLocalRoute));
router.delete('/:id', jwtUtils, requirePtyssModule, requireAdminOrOperations, catchedAsync(deletePTYSSLocalRoute));

// Asociación y desasociación de clientes reales a esquemas de rutas - solo admin/operaciones
router.post('/associate-client', jwtUtils, requirePtyssModule, requireAdminOrOperations, catchedAsync(associateClientToRouteSet));
router.post('/disassociate-client', jwtUtils, requirePtyssModule, requireAdminOrOperations, catchedAsync(disassociateClientFromRouteSet));

export default router; 