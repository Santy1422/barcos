import { Router } from 'express';
import ptyssRoutesControllers from '../controllers/ptyssRoutesControllers/ptyssRoutesControllers';
import importPTYSSRoutes from '../controllers/ptyssRoutesControllers/importPTYSSRoutes';
import fixPTYSSRoutesIndexes from '../controllers/ptyssRoutesControllers/fixPTYSSRoutesIndexes';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrOperations } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');
const router = Router();

// CRUD
router.get('/', jwtUtils, requireAdminOrOperations, catchedAsync(ptyssRoutesControllers.getAllPTYSSRoutes));
router.post('/', jwtUtils, requireAdminOrOperations, catchedAsync(ptyssRoutesControllers.createPTYSSRoute));
router.put('/:id', jwtUtils, requireAdminOrOperations, catchedAsync(ptyssRoutesControllers.updatePTYSSRoute));
router.delete('/:id', jwtUtils, requireAdminOrOperations, catchedAsync(ptyssRoutesControllers.deletePTYSSRoute));

// Importación masiva
router.post('/import', jwtUtils, requireAdminOrOperations, catchedAsync(importPTYSSRoutes));

// Endpoint temporal para arreglar índices
router.post('/fix-indexes', jwtUtils, requireAdminOrOperations, catchedAsync(fixPTYSSRoutesIndexes));

// Endpoint temporal para listar todas las rutas (debugging)
router.get('/debug-list', catchedAsync(async (req, res) => {
  const PTYSSRoute = require('mongoose').model('PTYSSRoute', require('../database/schemas/ptyssRouteSchema').default);
  const routes = await PTYSSRoute.find({}).limit(50).sort({ createdAt: -1 });
  const count = await PTYSSRoute.countDocuments({});
  
  console.log(`Total de rutas PTYSS en BD: ${count}`);
  console.log('Primeras 50 rutas:');
  routes.forEach((route, index) => {
    console.log(`${index + 1}. ${route.name} | ${route.containerType} | ${route.routeType} | ${route.status} | ${route.cliente} | ${route.routeArea} | $${route.price}`);
  });
  
  res.json({
    error: false,
    payload: {
      message: `Se encontraron ${count} rutas PTYSS en la base de datos`,
      data: {
        total: count,
        routes: routes.map(r => ({
          name: r.name,
          from: r.from,
          to: r.to,
          containerType: r.containerType,
          routeType: r.routeType,
          status: r.status,
          cliente: r.cliente,
          routeArea: r.routeArea,
          price: r.price,
          createdAt: r.createdAt
        }))
      }
    }
  });
}));

export default router; 