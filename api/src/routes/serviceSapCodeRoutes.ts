import { Router } from 'express';
import {
  getAllServiceSapCodes,
  getServiceSapCodeByCode,
  createServiceSapCode,
  updateServiceSapCode,
  deleteServiceSapCode,
  seedAgencySapCodes
} from '../controllers/serviceSapCodeControllers';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/sap-service-codes - Get all SAP service codes
router.get('/', getAllServiceSapCodes);

// GET /api/sap-service-codes/:code - Get single SAP service code
router.get('/:code', getServiceSapCodeByCode);

// POST /api/sap-service-codes - Create new SAP service code
router.post('/', createServiceSapCode);

// PUT /api/sap-service-codes/:code - Update SAP service code
router.put('/:code', updateServiceSapCode);

// DELETE /api/sap-service-codes/:code - Deactivate SAP service code
router.delete('/:code', deleteServiceSapCode);

// POST /api/sap-service-codes/seed/agency - Seed default Agency SAP codes
router.post('/seed/agency', seedAgencySapCodes);

export default router;
