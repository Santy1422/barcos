import { Router } from 'express';
import clientsControllers from '../controllers/clientsControllers/clientsControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrCatalogos, requireAdminOrCatalogosOrClientes, requireAnyRole } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');

const router = Router();

// Crear cliente - Admin, catalogos o clientes
router.post('/', jwtUtils, requireAdminOrCatalogosOrClientes, catchedAsync(clientsControllers.createClient));

// Obtener todos los clientes - Cualquier usuario autenticado con algún rol activo
router.get('/', jwtUtils, requireAnyRole, catchedAsync(clientsControllers.getAllClients));

// Obtener clientes activos - Cualquier usuario autenticado con algún rol activo
router.get('/active', jwtUtils, requireAnyRole, catchedAsync(clientsControllers.getActiveClients));

// Buscar cliente por SAP code - Cualquier usuario autenticado con algún rol activo (sin filtrar por módulo)
router.get('/search/sap-code', jwtUtils, requireAnyRole, catchedAsync(clientsControllers.getClientBySapCode));

// Obtener cliente por ID - Cualquier usuario autenticado con algún rol activo
router.get('/:id', jwtUtils, requireAnyRole, catchedAsync(clientsControllers.getClientById));

// Actualizar cliente - Admin, catalogos o clientes
router.put('/:id', jwtUtils, requireAdminOrCatalogosOrClientes, catchedAsync(clientsControllers.updateClient));

// Eliminar cliente - Solo admin o catalogos
router.delete('/:id', jwtUtils, requireAdminOrCatalogos, catchedAsync(clientsControllers.deleteClient));

export default router;