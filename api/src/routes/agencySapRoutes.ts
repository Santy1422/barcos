import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import {
  generateSapXml,
  downloadSapXml,
  getServicesReadyForInvoice,
  getSapXmlHistory,
  validateXmlStructure
} from '../controllers/agencyControllers/agencySapControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrOperations } from '../middlewares/authorization';
import { body, param, query, validationResult } from 'express-validator';

const { catchedAsync } = require('../utils');
const router = Router();

// Rate limiting específico para operaciones SAP críticas
const sapGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 generaciones de XML por hora por usuario
  message: {
    error: 'Too many SAP XML generation requests. Limit: 10 per hour',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${req.ip}-${(req as any).user?.id || 'anonymous'}`;
  }
});

const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // máximo 50 downloads por 15 minutos
  message: {
    error: 'Too many download requests. Limit: 50 per 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware para validar errores de express-validator
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      error: 'Validation failed',
      validationErrors: errors.array()
    });
  }
  next();
};

// Middleware para logging de operaciones SAP críticas
const logSapOperation = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    console.log(`SAP ${operation} initiated by user: ${user?.email || 'unknown'} (${user?.role || 'unknown'}) at ${new Date().toISOString()}`);
    next();
  };
};

// Validaciones para generación de XML
const xmlGenerationValidation = [
  body('serviceIds')
    .isArray({ min: 1 })
    .withMessage('serviceIds must be a non-empty array')
    .custom((serviceIds) => {
      if (!Array.isArray(serviceIds)) return false;
      return serviceIds.every(id => typeof id === 'string' && id.length > 0);
    })
    .withMessage('All serviceIds must be valid non-empty strings'),
    
  body('invoiceNumber')
    .notEmpty()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Invoice number is required (3-50 characters)')
    .matches(/^[A-Z0-9-_]+$/)
    .withMessage('Invoice number can only contain uppercase letters, numbers, hyphens, and underscores'),
    
  body('invoiceDate')
    .notEmpty()
    .isISO8601()
    .withMessage('Invoice date must be a valid ISO 8601 date'),
    
  body('postingDate')
    .optional()
    .isISO8601()
    .withMessage('Posting date must be a valid ISO 8601 date'),
    
  handleValidationErrors
];

// Validaciones para consultas
const queryValidation = [
  query('clientId')
    .optional()
    .custom((value) => {
      if (value === 'all') return true;
      return /^[0-9a-fA-F]{24}$/.test(value);
    })
    .withMessage('Client ID must be a valid MongoDB ObjectId or "all"'),
    
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
    
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.query?.startDate && endDate) {
        const start = new Date(req.query.startDate as string);
        const end = new Date(endDate);
        if (end <= start) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
    
  query('vessel')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Vessel name must be maximum 100 characters'),
    
  query('pickupLocation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Pickup location must be maximum 100 characters'),
    
  handleValidationErrors
];

// Validaciones para historial
const historyValidation = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be an integer between 1 and 1000'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
    
  handleValidationErrors
];

// Validación de nombres de archivo
const fileNameValidation = [
  param('fileName')
    .matches(/^AGENCY_INVOICE_[A-Z0-9-_]+_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.xml$/)
    .withMessage('Invalid Agency XML filename format'),
    
  handleValidationErrors
];

// Middleware de autorización específico para operaciones SAP críticas
const requireSapPermissions = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  const allowedRoles = ['admin', 'operations', 'finance'];
  
  if (!user || !allowedRoles.includes(user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions for SAP operations',
      requiredRoles: allowedRoles,
      userRole: user?.role || 'unknown'
    });
  }
  
  next();
};

// Todas las rutas requieren autenticación
router.use(jwtUtils);

// GET /api/agency/sap/ready-for-invoice - Servicios listos para facturar
router.get('/ready-for-invoice',
  requireAdminOrOperations,
  queryValidation,
  logSapOperation('QUERY_READY_SERVICES'),
  catchedAsync(getServicesReadyForInvoice)
);

// POST /api/agency/sap/generate-xml - Generar XML para SAP
router.post('/generate-xml',
  requireSapPermissions,
  sapGenerationLimiter,
  xmlGenerationValidation,
  logSapOperation('GENERATE_XML'),
  catchedAsync(generateSapXml)
);

// GET /api/agency/sap/download/:fileName - Descargar XML generado
router.get('/download/:fileName',
  requireAdminOrOperations,
  downloadLimiter,
  fileNameValidation,
  logSapOperation('DOWNLOAD_XML'),
  catchedAsync(downloadSapXml)
);

// GET /api/agency/sap/history - Historial de XMLs generados
router.get('/history',
  requireAdminOrOperations,
  historyValidation,
  logSapOperation('QUERY_HISTORY'),
  catchedAsync(getSapXmlHistory)
);

// POST /api/agency/sap/validate-xml - Validar estructura XML (endpoint de testing)
router.post('/validate-xml',
  requireSapPermissions,
  [
    body('xmlData')
      .notEmpty()
      .withMessage('xmlData is required'),
    handleValidationErrors
  ],
  logSapOperation('VALIDATE_XML'),
  catchedAsync(async (req: Request, res: Response) => {
    const { xmlData } = req.body;
    
    try {
      const validation = validateXmlStructure(xmlData);
      
      res.json({
        success: true,
        validation: {
          isValid: validation.valid,
          errors: validation.errors,
          warningsCount: validation.errors.filter(e => e.includes('may need verification')).length,
          errorsCount: validation.errors.filter(e => !e.includes('may need verification')).length
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Invalid XML data structure',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// GET /api/agency/sap/statistics - Estadísticas de facturación SAP
router.get('/statistics',
  requireAdminOrOperations,
  [
    query('period')
      .optional()
      .isIn(['week', 'month', 'quarter', 'year'])
      .withMessage('Period must be one of: week, month, quarter, year'),
    handleValidationErrors
  ],
  logSapOperation('QUERY_STATISTICS'),
  catchedAsync(async (req: Request, res: Response) => {
    const { period = 'month' } = req.query;
    
    // Calcular fechas según el período
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default: // month
        startDate.setMonth(now.getMonth() - 1);
    }

    const AgencyService = require('../database/schemas/agencyServiceSchema');
    
    // Estadísticas generales
    const totalInvoiced = await AgencyService.countDocuments({
      status: { $in: ['prefacturado', 'facturado'] },
      invoiceDate: { $gte: startDate, $lte: now },
      module: 'AGENCY'
    });

    const totalRevenue = await AgencyService.aggregate([
      {
        $match: {
          status: { $in: ['prefacturado', 'facturado'] },
          invoiceDate: { $gte: startDate, $lte: now },
          module: 'AGENCY'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$price' }
        }
      }
    ]);

    // Estadísticas por mes
    const monthlyStats = await AgencyService.aggregate([
      {
        $match: {
          status: { $in: ['prefacturado', 'facturado'] },
          invoiceDate: { $gte: startDate, $lte: now },
          module: 'AGENCY'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        period,
        dateRange: { from: startDate, to: now },
        statistics: {
          totalInvoiced,
          totalRevenue: totalRevenue[0]?.total || 0,
          averageInvoiceValue: totalInvoiced > 0 ? (totalRevenue[0]?.total || 0) / totalInvoiced : 0,
          monthlyBreakdown: monthlyStats
        }
      }
    });
  })
);

export default router;