import { Router } from 'express';
import {
  createErrorLog,
  getErrorLogs,
  getErrorStats,
  resolveError,
  clearResolvedErrors
} from '../controllers/errorLogController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Crear error log (puede ser público para el frontend)
router.post('/', createErrorLog);

// Rutas protegidas
router.get('/', authenticateToken, getErrorLogs);
router.get('/stats', authenticateToken, getErrorStats);
router.patch('/:id/resolve', authenticateToken, resolveError);
router.delete('/clear', authenticateToken, clearResolvedErrors);

export default router;
