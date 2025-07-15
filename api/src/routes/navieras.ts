import express from 'express'
import { jwtUtils } from '../middlewares/jwtUtils'
import {
  createNaviera,
  getAllNavieras,
  getNavieraById,
  updateNaviera,
  deleteNaviera
} from '../controllers/configControllers/navieraControllers'
const { catchedAsync } = require('../utils')

const router = express.Router()

// Aplicar middleware de autenticación a todas las rutas
router.use(jwtUtils)

// Rutas para navieras
router.route('/')
  .get(catchedAsync(getAllNavieras))
  .post(catchedAsync(createNaviera))

router.route('/:id')
  .get(catchedAsync(getNavieraById))
  .patch(catchedAsync(updateNaviera))
  .delete(catchedAsync(deleteNaviera))

export default router 