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

const router = Router();

// Todas las rutas requieren autenticación
router.use(jwtUtils);

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

export default router;

