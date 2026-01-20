import { Router } from 'express';
import {
  createErrorLog,
  getErrorLogs,
  getErrorStats,
  resolveError,
  clearResolvedErrors
} from '../controllers/errorLogController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

// Crear error log (puede ser público para el frontend)
router.post('/', createErrorLog);

// Rutas protegidas
router.get('/', verifyToken, getErrorLogs);
router.get('/stats', verifyToken, getErrorStats);
router.patch('/:id/resolve', verifyToken, resolveError);
router.delete('/clear', verifyToken, clearResolvedErrors);

export default router;
