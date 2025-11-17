import { Router } from 'express';
import {
  getRoutes,
  getActiveRoutes,
  getRouteById,
  getRouteByLocations,
  calculateRoutePrice,
  createRoute,
  updateRoute,
  deactivateRoute,
  reactivateRoute,
  deleteRoute,
  getRoutesByLocation,
  getRouteStatistics
} from '../controllers/agencyRouteController';
import { jwtUtils } from '../middlewares/jwtUtils';
import { requireAgencyModule } from '../middlewares/authorization';

const router = Router();

// Middleware de logging para debug
router.use((req, res, next) => {
  console.log('🔧 [ROUTES] Incoming request:', req.method, req.path);
  console.log('🔧 [ROUTES] Request body:', req.body);
  console.log('🔧 [ROUTES] Headers:', req.headers.authorization ? 'Auth present' : 'No auth');
  console.log('🔧 [ROUTES] Full headers:', req.headers);
  next();
});

// Ruta de prueba sin autenticación
router.get('/test', (req, res) => {
  console.log('🔧 [TEST] Test endpoint called');
  res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

// Todas las rutas requieren autenticación y acceso al módulo Agency
router.use(jwtUtils);
router.use(requireAgencyModule);

// GET routes
router.get('/', getRoutes);
router.get('/active', getActiveRoutes);
router.get('/statistics', getRouteStatistics);
router.get('/lookup', getRouteByLocations);
router.get('/location/:location', getRoutesByLocation);
router.get('/:id', getRouteById);

// POST routes
router.post('/', createRoute);
router.post('/calculate-price', calculateRoutePrice);

// PUT routes
router.put('/:id', updateRoute);
router.put('/:id/deactivate', deactivateRoute);
router.put('/:id/reactivate', reactivateRoute);

// DELETE routes
router.delete('/:id', deleteRoute);

// Middleware de manejo de errores
router.use((error: any, req: any, res: any, next: any) => {
  console.error('❌ [ROUTES] Error middleware caught:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

export default router;

