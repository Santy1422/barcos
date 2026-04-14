import { Router } from 'express';
import {
  getVehicleTypes,
  getActiveVehicleTypes,
  getVehicleTypeById,
  createVehicleType,
  updateVehicleType,
  deleteVehicleType,
} from '../controllers/agencyVehicleTypeController';
import { jwtUtils } from '../middlewares/jwtUtils';
import { requireAgencyModule } from '../middlewares/authorization';

const router = Router();

router.use(jwtUtils);
router.use(requireAgencyModule);

router.get('/active', getActiveVehicleTypes);
router.get('/', getVehicleTypes);
router.get('/:id', getVehicleTypeById);
router.post('/', createVehicleType);
router.put('/:id', updateVehicleType);
router.delete('/:id', deleteVehicleType);

export default router;
