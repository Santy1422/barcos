import express from 'express'
import { jwtUtils } from '../middlewares/jwtUtils'
import {
  getLocalServices,
  createLocalService,
  updateLocalService,
  deleteLocalService
} from '../controllers/configControllers/localServicesControllers'
const { catchedAsync } = require('../utils')

const router = express.Router()

// Aplicar middleware de autenticación a todas las rutas
router.use(jwtUtils)

// Rutas para servicios locales
router.route('/')
  .get(catchedAsync(getLocalServices))
  .post(catchedAsync(createLocalService))

router.route('/:id')
  .put(catchedAsync(updateLocalService))
  .delete(catchedAsync(deleteLocalService))

export default router 