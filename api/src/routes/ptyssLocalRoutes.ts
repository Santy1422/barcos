import { Router } from 'express';
import ptyssLocalRoutesControllers from '../controllers/ptyssLocalRoutesControllers/ptyssLocalRoutesControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrOperations } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');
const router = Router();

// CRUD
router.get('/', jwtUtils, requireAdminOrOperations, catchedAsync(ptyssLocalRoutesControllers.getAllPTYSSLocalRoutes));
router.post('/', jwtUtils, requireAdminOrOperations, catchedAsync(ptyssLocalRoutesControllers.createPTYSSLocalRoute));
router.put('/:id', jwtUtils, requireAdminOrOperations, catchedAsync(ptyssLocalRoutesControllers.updatePTYSSLocalRoute));
router.delete('/:id', jwtUtils, requireAdminOrOperations, catchedAsync(ptyssLocalRoutesControllers.deletePTYSSLocalRoute));

export default router; 