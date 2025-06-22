import { Router } from 'express';
import dashboardControllers from '../controllers/dashboardControllers/dashboardControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAnyRole } from '../middlewares/authorization';

const { catchedAsync } = require('../utils');
const router = Router();

router.get('/stats', jwtUtils, requireAnyRole, catchedAsync(dashboardControllers.getDashboardStats));
router.get('/activity', jwtUtils, requireAnyRole, catchedAsync(dashboardControllers.getRecentActivity));
router.get('/modules', jwtUtils, requireAnyRole, catchedAsync(dashboardControllers.getModuleStats));
router.get('/financial', jwtUtils, requireAnyRole, catchedAsync(dashboardControllers.getFinancialSummary));

export default router;