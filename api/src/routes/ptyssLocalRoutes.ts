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
import { requireAdminOrOperations, requireAdminOrCatalogos, requirePtyssModule, requireAnyRole } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');
const router = Router();

// Gestión de esquemas - permitir lectura a todos con módulo, escritura a admin/catalogos
router.get('/schemas/summary', jwtUtils, requirePtyssModule, catchedAsync(getSchemaSummary));
router.post('/schemas', jwtUtils, requirePtyssModule, requireAdminOrCatalogos, catchedAsync(createRouteSchema));
router.delete('/schemas/:schemaName', jwtUtils, requirePtyssModule, requireAdminOrCatalogos, catchedAsync(deleteRouteSchema));

// Rutas PTYSS Local Routes - permitir lectura a todos con módulo, escritura a cualquier rol autorizado
router.get('/', jwtUtils, requirePtyssModule, catchedAsync(getAllPTYSSLocalRoutes));
router.post('/', jwtUtils, requirePtyssModule, requireAnyRole, catchedAsync(createPTYSSLocalRoute));
router.put('/:id', jwtUtils, requirePtyssModule, requireAnyRole, catchedAsync(updatePTYSSLocalRoute));
router.delete('/:id', jwtUtils, requirePtyssModule, requireAdminOrCatalogos, catchedAsync(deletePTYSSLocalRoute));

// Asociación y desasociación de clientes reales a esquemas de rutas - admin/catalogos
router.post('/associate-client', jwtUtils, requirePtyssModule, requireAdminOrCatalogos, catchedAsync(associateClientToRouteSet));
router.post('/disassociate-client', jwtUtils, requirePtyssModule, requireAdminOrCatalogos, catchedAsync(disassociateClientFromRouteSet));

export default router; 