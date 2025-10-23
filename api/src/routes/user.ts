import { Router } from 'express'
import usersControllers from '../controllers/usersControllers/usersControllers';
import {jwtUtils} from "../middlewares/jwtUtils";
import { requireAdmin } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');

const router = Router();

// Public routes
router.post('/login', catchedAsync(usersControllers.login));
router.post('/register', catchedAsync(usersControllers.register));

// Protected routes
router.post('/reloadUser', jwtUtils, catchedAsync(usersControllers.reloadUser));

// Admin-only routes
router.get('/all', jwtUtils, requireAdmin, catchedAsync(usersControllers.getAllUsers));
router.put('/:userId', jwtUtils, requireAdmin, catchedAsync(usersControllers.updateUser));
router.put('/reset-password/:userId', jwtUtils, requireAdmin, catchedAsync(usersControllers.resetPassword));
router.delete('/:userId', jwtUtils, requireAdmin, catchedAsync(usersControllers.deleteUser));

export default router;
