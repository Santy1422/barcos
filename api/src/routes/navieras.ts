import express from 'express'
import { jwtUtils } from '../middlewares/jwtUtils'
import { requireAdminOrCatalogos, requireAdminOrCatalogosOrOperations } from '../middlewares/authorization'
import {
  createNaviera,
  getAllNavieras,
  getNavieraById,
  updateNaviera,
  deleteNaviera
} from '../controllers/configControllers/navieraControllers'
const { catchedAsync } = require('../utils')

const router = express.Router()

// Rutas para navieras
// Operaciones de lectura: permite admin, catalogos y operaciones
router.get('/', jwtUtils, requireAdminOrCatalogosOrOperations, catchedAsync(getAllNavieras))
router.get('/:id', jwtUtils, requireAdminOrCatalogosOrOperations, catchedAsync(getNavieraById))

// Operaciones de escritura: solo admin o catalogos
router.post('/', jwtUtils, requireAdminOrCatalogos, catchedAsync(createNaviera))
router.patch('/:id', jwtUtils, requireAdminOrCatalogos, catchedAsync(updateNaviera))
router.delete('/:id', jwtUtils, requireAdminOrCatalogos, catchedAsync(deleteNaviera))

export default router 