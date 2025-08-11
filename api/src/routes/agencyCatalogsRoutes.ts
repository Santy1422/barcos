import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getAllCatalogs,
  getCatalogsByType,
  createCatalogEntry,
  updateCatalogEntry,
  deleteCatalogEntry,
  seedCatalogs,
  searchCatalogs,
  reactivateCatalogEntry
} from '../controllers/agencyCatalogsControllers/agencyCatalogsControllers';
import {
  calculateServicePrice,
  createRoutePricing,
  updateRoutePricing,
  getAllRoutePricing,
  deleteRoutePricing,
  seedRoutePricing,
  getPricingStats
} from '../controllers/agencyControllers/agencyPricingControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrOperations } from '../middlewares/authorization';
import { body, param, query, validationResult } from 'express-validator';

const { catchedAsync } = require('../utils');
const router = Router();

// Valid catalog types
const VALID_CATALOG_TYPES = [
  'location',
  'nationality', 
  'rank',
  'vessel',
  'transport_company',
  'driver',
  'taulia_code',
  'route_pricing'
];

// Rate limiting
const createCatalogLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 creates per hour per user
  message: 'Too many catalog entries created, try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const seedLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1, // 1 seed operation per hour
  message: 'Seed operation can only be performed once per hour',
  standardHeaders: true,
  legacyHeaders: false,
});

const bulkOperationsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 bulk operations per hour
  message: 'Too many bulk operations, try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware para validar errores
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validar tipo de catálogo
const validateCatalogType = (req: Request, res: Response, next: NextFunction) => {
  const type = req.params.type || req.body.type;
  
  if (type && !VALID_CATALOG_TYPES.includes(type)) {
    return res.status(400).json({ 
      error: `Invalid catalog type. Valid types: ${VALID_CATALOG_TYPES.join(', ')}` 
    });
  }
  
  next();
};

// Validar metadata por tipo
const validateMetadata = (req: Request, res: Response, next: NextFunction) => {
  const { type, metadata } = req.body;
  
  if (!metadata) return next();
  
  try {
    switch (type) {
      case 'location':
        if (metadata.siteType && typeof metadata.siteType !== 'string') {
          return res.status(400).json({ 
            error: 'siteType must be a string for location type' 
          });
        }
        break;
      
      case 'taulia_code':
        if (metadata.price !== undefined && typeof metadata.price !== 'number') {
          return res.status(400).json({ 
            error: 'price must be a number for taulia_code type' 
          });
        }
        if (metadata.category && typeof metadata.category !== 'string') {
          return res.status(400).json({ 
            error: 'category must be a string for taulia_code type' 
          });
        }
        break;
      
      case 'rank':
        if (metadata.company && typeof metadata.company !== 'string') {
          return res.status(400).json({ 
            error: 'company must be a string for rank type' 
          });
        }
        if (metadata.level !== undefined && typeof metadata.level !== 'number') {
          return res.status(400).json({ 
            error: 'level must be a number for rank type' 
          });
        }
        break;
      
      case 'driver':
        if (metadata.phone && typeof metadata.phone !== 'string') {
          return res.status(400).json({ 
            error: 'phone must be a string for driver type' 
          });
        }
        if (metadata.company && typeof metadata.company !== 'string') {
          return res.status(400).json({ 
            error: 'company must be a string for driver type' 
          });
        }
        break;
      
      case 'route_pricing':
        if (metadata.basePrice !== undefined && typeof metadata.basePrice !== 'number') {
          return res.status(400).json({ 
            error: 'basePrice must be a number for route_pricing type' 
          });
        }
        if (metadata.pricePerPerson !== undefined && typeof metadata.pricePerPerson !== 'number') {
          return res.status(400).json({ 
            error: 'pricePerPerson must be a number for route_pricing type' 
          });
        }
        if (metadata.waitingTimePrice !== undefined && typeof metadata.waitingTimePrice !== 'number') {
          return res.status(400).json({ 
            error: 'waitingTimePrice must be a number for route_pricing type' 
          });
        }
        if (metadata.fromLocation && typeof metadata.fromLocation !== 'string') {
          return res.status(400).json({ 
            error: 'fromLocation must be a string for route_pricing type' 
          });
        }
        if (metadata.toLocation && typeof metadata.toLocation !== 'string') {
          return res.status(400).json({ 
            error: 'toLocation must be a string for route_pricing type' 
          });
        }
        break;
    }
    
    next();
  } catch (error) {
    return res.status(400).json({ 
      error: 'Invalid metadata format',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Require admin for sensitive operations
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const userRole = (req as any).user?.role;
  
  if (userRole !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required for this operation' 
    });
  }
  
  next();
};

// Validaciones
const catalogValidation = [
  body('type').notEmpty().isIn(VALID_CATALOG_TYPES)
    .withMessage(`Type must be one of: ${VALID_CATALOG_TYPES.join(', ')}`),
  body('name').notEmpty().trim().isLength({ min: 1, max: 200 })
    .withMessage('Name is required and must be between 1-200 characters'),
  body('code').optional().isString().trim().isLength({ max: 50 })
    .withMessage('Code must be maximum 50 characters'),
  body('description').optional().isString().trim().isLength({ max: 500 })
    .withMessage('Description must be maximum 500 characters'),
  body('metadata').optional().isObject()
    .withMessage('Metadata must be an object'),
  handleValidationErrors
];

const updateValidation = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 200 })
    .withMessage('Name must be between 1-200 characters'),
  body('code').optional().isString().trim().isLength({ max: 50 })
    .withMessage('Code must be maximum 50 characters'),
  body('description').optional().isString().trim().isLength({ max: 500 })
    .withMessage('Description must be maximum 500 characters'),
  body('metadata').optional().isObject()
    .withMessage('Metadata must be an object'),
  body('isActive').optional().isBoolean()
    .withMessage('isActive must be boolean'),
  handleValidationErrors
];

const queryValidation = [
  query('active').optional().isBoolean()
    .withMessage('active must be boolean'),
  query('search').optional().isString().trim().isLength({ min: 1, max: 100 })
    .withMessage('search must be between 1-100 characters'),
  query('includeMetadata').optional().isBoolean()
    .withMessage('includeMetadata must be boolean'),
  handleValidationErrors
];

const searchValidation = [
  query('q').notEmpty().isString().trim().isLength({ min: 1, max: 100 })
    .withMessage('Search query (q) is required and must be between 1-100 characters'),
  query('types').optional().custom((value) => {
    if (typeof value === 'string') {
      const types = value.split(',');
      const invalidTypes = types.filter(t => !VALID_CATALOG_TYPES.includes(t));
      if (invalidTypes.length > 0) {
        throw new Error(`Invalid types: ${invalidTypes.join(', ')}`);
      }
    }
    return true;
  }),
  query('limit').optional().isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1-100'),
  handleValidationErrors
];

// Todas las rutas requieren autenticación
router.use(jwtUtils);

// GET /api/agency/catalogs - Get all catalogs grouped by type
router.get('/',
  requireAdminOrOperations,
  queryValidation,
  catchedAsync(getAllCatalogs)
);

// GET /api/agency/catalogs/search - Search across all catalog types
router.get('/search',
  requireAdminOrOperations,
  searchValidation,
  catchedAsync(searchCatalogs)
);

// POST /api/agency/catalogs/seed - Seed catalogs with initial data (ADMIN ONLY)
router.post('/seed',
  requireAdmin,
  seedLimiter,
  [
    body('force').optional().isBoolean()
      .withMessage('force must be boolean'),
    body('types').optional().isArray()
      .withMessage('types must be array')
      .custom((types) => {
        if (types) {
          const invalidTypes = types.filter((t: string) => !VALID_CATALOG_TYPES.includes(t));
          if (invalidTypes.length > 0) {
            throw new Error(`Invalid types: ${invalidTypes.join(', ')}`);
          }
        }
        return true;
      }),
    handleValidationErrors
  ],
  catchedAsync(seedCatalogs)
);

// GET /api/agency/catalogs/:type - Get catalogs by type
router.get('/:type',
  requireAdminOrOperations,
  [
    param('type').isIn(VALID_CATALOG_TYPES)
      .withMessage(`Type must be one of: ${VALID_CATALOG_TYPES.join(', ')}`),
    handleValidationErrors
  ],
  validateCatalogType,
  queryValidation,
  catchedAsync(getCatalogsByType)
);

// POST /api/agency/catalogs - Create new catalog entry
router.post('/',
  requireAdminOrOperations,
  createCatalogLimiter,
  catalogValidation,
  validateCatalogType,
  validateMetadata,
  catchedAsync(createCatalogEntry)
);

// PUT /api/agency/catalogs/:id - Update catalog entry
router.put('/:id',
  requireAdminOrOperations,
  [
    param('id').isMongoId()
      .withMessage('Invalid ID format'),
    handleValidationErrors
  ],
  updateValidation,
  validateMetadata,
  catchedAsync(updateCatalogEntry)
);

// PUT /api/agency/catalogs/:id/reactivate - Reactivate catalog entry
router.put('/:id/reactivate',
  requireAdminOrOperations,
  [
    param('id').isMongoId()
      .withMessage('Invalid ID format'),
    handleValidationErrors
  ],
  catchedAsync(reactivateCatalogEntry)
);

// DELETE /api/agency/catalogs/:id - Delete catalog entry (soft delete)
router.delete('/:id',
  requireAdminOrOperations,
  [
    param('id').isMongoId()
      .withMessage('Invalid ID format'),
    query('force').optional().isBoolean()
      .withMessage('force must be boolean'),
    handleValidationErrors
  ],
  catchedAsync(deleteCatalogEntry)
);

// ===== PRICING ROUTES =====

// Rate limiting for pricing operations
const pricingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many pricing requests, try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/agency/catalogs/pricing/calculate - Calculate service price
router.post('/pricing/calculate',
  requireAdminOrOperations,
  pricingLimiter,
  [
    body('pickupLocation').notEmpty().trim()
      .withMessage('pickupLocation is required'),
    body('dropoffLocation').notEmpty().trim()
      .withMessage('dropoffLocation is required'),
    body('serviceCode').optional().isString().trim()
      .withMessage('serviceCode must be string'),
    body('waitingTime').optional().isFloat({ min: 0, max: 24 })
      .withMessage('waitingTime must be between 0-24 hours'),
    body('passengerCount').optional().isInt({ min: 1, max: 8 })
      .withMessage('passengerCount must be between 1-8'),
    handleValidationErrors
  ],
  calculateServicePrice
);

// GET /api/agency/catalogs/pricing/routes - Get all route pricing
router.get('/pricing/routes',
  requireAdminOrOperations,
  [
    query('active').optional().isBoolean()
      .withMessage('active must be boolean'),
    query('grouped').optional().isBoolean()
      .withMessage('grouped must be boolean'),
    handleValidationErrors
  ],
  getAllRoutePricing
);

// POST /api/agency/catalogs/pricing/routes - Create route pricing
router.post('/pricing/routes',
  requireAdminOrOperations,
  createCatalogLimiter,
  [
    body('fromLocation').notEmpty().trim()
      .withMessage('fromLocation is required'),
    body('toLocation').notEmpty().trim()
      .withMessage('toLocation is required'),
    body('basePrice').isFloat({ min: 0 })
      .withMessage('basePrice must be a non-negative number'),
    body('pricePerPerson').optional().isFloat({ min: 0 })
      .withMessage('pricePerPerson must be non-negative'),
    body('waitingTimePrice').optional().isFloat({ min: 0 })
      .withMessage('waitingTimePrice must be non-negative'),
    body('tauliaCode').optional().isString().trim()
      .withMessage('tauliaCode must be string'),
    body('description').optional().isString().trim().isLength({ max: 500 })
      .withMessage('description must be maximum 500 characters'),
    handleValidationErrors
  ],
  createRoutePricing
);

// PUT /api/agency/catalogs/pricing/routes/:id - Update route pricing
router.put('/pricing/routes/:id',
  requireAdminOrOperations,
  [
    param('id').isMongoId()
      .withMessage('Invalid ID format'),
    body('basePrice').optional().isFloat({ min: 0 })
      .withMessage('basePrice must be non-negative'),
    body('pricePerPerson').optional().isFloat({ min: 0 })
      .withMessage('pricePerPerson must be non-negative'),
    body('waitingTimePrice').optional().isFloat({ min: 0 })
      .withMessage('waitingTimePrice must be non-negative'),
    body('tauliaCode').optional().isString().trim()
      .withMessage('tauliaCode must be string'),
    body('description').optional().isString().trim().isLength({ max: 500 })
      .withMessage('description must be maximum 500 characters'),
    body('isActive').optional().isBoolean()
      .withMessage('isActive must be boolean'),
    handleValidationErrors
  ],
  updateRoutePricing
);

// DELETE /api/agency/catalogs/pricing/routes/:id - Delete route pricing
router.delete('/pricing/routes/:id',
  requireAdminOrOperations,
  [
    param('id').isMongoId()
      .withMessage('Invalid ID format'),
    handleValidationErrors
  ],
  deleteRoutePricing
);

// POST /api/agency/catalogs/pricing/seed - Seed route pricing data (ADMIN ONLY)
router.post('/pricing/seed',
  requireAdmin,
  seedLimiter,
  [
    body('force').optional().isBoolean()
      .withMessage('force must be boolean'),
    handleValidationErrors
  ],
  seedRoutePricing
);

// GET /api/agency/catalogs/pricing/stats - Get pricing statistics
router.get('/pricing/stats',
  requireAdminOrOperations,
  getPricingStats
);

export default router;