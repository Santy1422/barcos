import express from 'express'
import { jwtUtils } from '../middlewares/jwtUtils'
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus
} from '../controllers/configControllers/servicesControllers'
const { catchedAsync } = require('../utils')

const router = express.Router()

// Aplicar middleware de autenticación a todas las rutas
router.use(jwtUtils)

// Rutas para servicios
router.route('/')
  .get(catchedAsync(getAllServices))
  .post(catchedAsync(createService))

router.route('/:id')
  .get(catchedAsync(getServiceById))
  .put(catchedAsync(updateService))
  .delete(catchedAsync(deleteService))

router.patch('/:id/toggle', catchedAsync(toggleServiceStatus))

export default router 