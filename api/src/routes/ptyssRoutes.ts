import { Router } from 'express';
import ptyssRoutesControllers from '../controllers/ptyssRoutesControllers/ptyssRoutesControllers';
import importPTYSSRoutes from '../controllers/ptyssRoutesControllers/importPTYSSRoutes';
import fixPTYSSRoutesIndexes from '../controllers/ptyssRoutesControllers/fixPTYSSRoutesIndexes';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrOperations, requireShipchandlerModule, requireAnyRole } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');
const router = Router();

// CRUD - Usar verificación por módulo para GET (lectura), permitir a todos los usuarios con acceso a PTYSS
router.get('/', jwtUtils, requireShipchandlerModule, catchedAsync(ptyssRoutesControllers.getAllPTYSSRoutes));
// Para operaciones de escritura (crear, actualizar, eliminar), usar verificación por rol más estricta
router.post('/', jwtUtils, requireShipchandlerModule, requireAnyRole, catchedAsync(ptyssRoutesControllers.createPTYSSRoute));
router.put('/:id', jwtUtils, requireShipchandlerModule, requireAnyRole, catchedAsync(ptyssRoutesControllers.updatePTYSSRoute));
router.delete('/:id', jwtUtils, requireShipchandlerModule, requireAdminOrOperations, catchedAsync(ptyssRoutesControllers.deletePTYSSRoute));

// Importación masiva
router.post('/import', jwtUtils, requireShipchandlerModule, requireAdminOrOperations, catchedAsync(importPTYSSRoutes));

// Endpoint temporal para arreglar índices
router.post('/fix-indexes', jwtUtils, requireShipchandlerModule, requireAdminOrOperations, catchedAsync(fixPTYSSRoutesIndexes));

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