import { Router, Request, Response, NextFunction } from 'express';
import {
  getAllAgencyServices,
  createAgencyService,
  updateAgencyService,
  deleteAgencyService,
  updateAgencyServiceStatus,
  getServicesForInvoicing,
  getAgencyServiceById,
  getAgencyStatistics
} from '../controllers/agencyControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrOperations, requireAgencyModule, requireAnyRole } from '../middlewares/authorization';
import { body, param, query, validationResult } from 'express-validator';

const { catchedAsync } = require('../utils');
const router = Router();

// Middleware para validar errores de express-validator
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Middleware para validar transición de status
const validateStatusTransition = (req: Request, res: Response, next: NextFunction) => {
  const { status } = req.body;
  const validStatuses = ['tentative', 'pending', 'in_progress', 'completed', 'cancelled', 'prefacturado', 'facturado', 'nota_de_credito'];
  
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
    });
  }
  
  next();
};

// Middleware para validar datos de servicio
const validateServiceData = [
  body('pickupDate').notEmpty().isISO8601().withMessage('Valid pickup date is required'),
  body('pickupTime').notEmpty().withMessage('Pickup time is required').trim(),
  body('pickupLocation').notEmpty().withMessage('Pickup location is required').trim(),
  body('dropoffLocation').notEmpty().withMessage('Dropoff location is required').trim(),
  body('vessel').optional().trim(),
  // crewMembers o crewName es requerido (validado en el controlador)
  body('crewMembers').optional().isArray().withMessage('Crew members must be an array'),
  body('crewName').optional().trim(),
  // clientId es requerido (se valida en el controlador)
  body('clientId').optional().isMongoId().withMessage('Valid client ID required'),
  body('moveType').optional().isIn(['RT', 'SINGLE', 'INTERNAL', 'BAGS_CLAIM', 'DOCUMENTATION', 'NO_SHOW']).withMessage('Move type must be RT, SINGLE, INTERNAL, BAGS_CLAIM, DOCUMENTATION or NO_SHOW'),
  body('approve').optional().isBoolean().withMessage('Approve must be boolean'),
  body('passengerCount').optional().isInt({ min: 1 }).withMessage('Passenger count must be positive integer'),
  body('waitingTime').optional().isNumeric().withMessage('Waiting time must be numeric'),
  body('price').optional().isNumeric().withMessage('Price must be numeric'),
  handleValidationErrors
];

// Validaciones para query params
const validateQueryParams = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date'),
  query('clientId').optional().isMongoId().withMessage('Client ID must be valid MongoDB ID'),
  handleValidationErrors
];

// Validación de ID params
const validateId = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  handleValidationErrors
];

// Todas las rutas requieren autenticación y acceso al módulo Agency
router.use(jwtUtils);
router.use(requireAgencyModule);

// GET /api/agency/services - Get all agency services with filters
router.get('/', 
  validateQueryParams,
  catchedAsync(getAllAgencyServices)
);

// GET /api/agency/services/statistics - Get service statistics
router.get('/statistics',
  validateQueryParams,
  catchedAsync(getAgencyStatistics)
);

// GET /api/agency/services/invoicing - Get services ready for invoicing
router.get('/invoicing',
  validateQueryParams,
  catchedAsync(getServicesForInvoicing)
);

// GET /api/agency/services/:id - Get service by ID
router.get('/:id',
  validateId,
  catchedAsync(getAgencyServiceById)
);

// POST /api/agency/services - Create new agency service (requiere cualquier rol autorizado)
router.post('/',
  requireAnyRole,
  validateServiceData,
  catchedAsync(createAgencyService)
);

// PUT /api/agency/services/:id - Update agency service (requiere cualquier rol autorizado)
router.put('/:id',
  requireAnyRole,
  validateId,
  [
    body('pickupDate').optional().isISO8601().withMessage('Valid pickup date required'),
    body('pickupTime').optional().trim(),
    body('pickupLocation').optional().trim(),
    body('dropoffLocation').optional().trim(),
    body('vessel').optional().trim(),
    body('waitingTime').optional().isNumeric().withMessage('Waiting time must be numeric'),
    body('price').optional().isNumeric().withMessage('Price must be numeric'),
    handleValidationErrors
  ],
  catchedAsync(updateAgencyService)
);

// PUT /api/agency/services/:id/status - Update service status (requiere cualquier rol autorizado)
router.put('/:id/status',
  requireAnyRole,
  validateId,
  [
    body('status').notEmpty().withMessage('Status is required'),
    handleValidationErrors
  ],
  validateStatusTransition,
  catchedAsync(updateAgencyServiceStatus)
);

// DELETE /api/agency/services/:id - Delete agency service (solo admin/operaciones)
router.delete('/:id',
  requireAdminOrOperations,
  validateId,
  [
    query('hardDelete').optional().isBoolean().withMessage('hardDelete must be boolean'),
    handleValidationErrors
  ],
  catchedAsync(deleteAgencyService)
);

export default router;