import { Router } from 'express';
import clientsControllers from '../controllers/clientsControllers/clientsControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrCatalogos, requireAnyRole } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');

const router = Router();

// Crear cliente - Solo admin o catalogos
router.post('/', jwtUtils, requireAdminOrCatalogos, catchedAsync(clientsControllers.createClient));

// Obtener todos los clientes - Cualquier usuario autenticado con algún rol activo
router.get('/', jwtUtils, requireAnyRole, catchedAsync(clientsControllers.getAllClients));

// Obtener clientes activos - Cualquier usuario autenticado con algún rol activo
router.get('/active', jwtUtils, requireAnyRole, catchedAsync(clientsControllers.getActiveClients));

// Obtener cliente por ID - Cualquier usuario autenticado con algún rol activo
router.get('/:id', jwtUtils, requireAnyRole, catchedAsync(clientsControllers.getClientById));

// Actualizar cliente - Solo admin o catalogos
router.put('/:id', jwtUtils, requireAdminOrCatalogos, catchedAsync(clientsControllers.updateClient));

// Eliminar cliente - Solo admin o catalogos
router.delete('/:id', jwtUtils, requireAdminOrCatalogos, catchedAsync(clientsControllers.deleteClient));

export default router;