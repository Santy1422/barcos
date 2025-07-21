import { Router } from 'express';
import ptyssRoutesControllers from '../controllers/ptyssRoutesControllers/ptyssRoutesControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrOperations } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');
const router = Router();

// CRUD
router.get('/', jwtUtils, requireAdminOrOperations, catchedAsync(ptyssRoutesControllers.getAllPTYSSRoutes));
router.post('/', jwtUtils, requireAdminOrOperations, catchedAsync(ptyssRoutesControllers.createPTYSSRoute));
router.put('/:id', jwtUtils, requireAdminOrOperations, catchedAsync(ptyssRoutesControllers.updatePTYSSRoute));
router.delete('/:id', jwtUtils, requireAdminOrOperations, catchedAsync(ptyssRoutesControllers.deletePTYSSRoute));

export default router; 