import { Router } from 'express';
import clientsControllers from '../controllers/clientsControllers/clientsControllers';
import { jwtUtils } from "../middlewares/jwtUtils";

const { catchedAsync } = require('../utils');

const router = Router();

// Crear cliente
router.post('/', jwtUtils, catchedAsync(clientsControllers.createClient));

// Obtener todos los clientes
router.get('/', catchedAsync(clientsControllers.getAllClients));

// Obtener clientes activos
router.get('/active', catchedAsync(clientsControllers.getActiveClients));

// Obtener cliente por ID
router.get('/:id', catchedAsync(clientsControllers.getClientById));

// Actualizar cliente
router.put('/:id', jwtUtils, catchedAsync(clientsControllers.updateClient));

// Eliminar cliente
router.delete('/:id', jwtUtils, catchedAsync(clientsControllers.deleteClient));

export default router;