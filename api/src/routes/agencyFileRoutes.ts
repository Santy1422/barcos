import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import {
  uploadServicePDF,
  getServiceFiles,
  deleteServiceFile,
  downloadServiceFile,
  viewServiceFile,
  bulkUploadServicePDFs,
  cleanupOrphanedFiles
} from '../controllers/agencyControllers';
import AgencyService from '../database/schemas/agencyServiceSchema';
import { jwtUtils } from "../middlewares/jwtUtils";
import { requireAdminOrOperations } from '../middlewares/authorization';
import { body, param, query, validationResult } from 'express-validator';

const { catchedAsync } = require('../utils');
const router = Router();

// Configure upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'agency');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('Created Agency upload directory:', UPLOAD_DIR);
}

// Rate limiting for file operations
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour per user
  message: 'Too many file uploads, try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 downloads per hour per user
  message: 'Too many file downloads, try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Multer configuration for single file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const serviceId = req.body.serviceId || 'temp';
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
    
    const fileName = `${serviceId}_${timestamp}_${sanitizedOriginalName}`;
    cb(null, fileName);
  }
});

// Multer configuration for multiple files
const storageMultiple = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const serviceId = req.body.serviceId || 'temp';
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
    
    const fileName = `${serviceId}_${timestamp}_${randomSuffix}_${sanitizedOriginalName}`;
    cb(null, fileName);
  }
});

// File filter for PDFs only
const fileFilter = (req: any, file: any, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

// Single file upload configuration
const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 1 // Single file
  }
});

// Multiple files upload configuration
const uploadMultiple = multer({
  storage: storageMultiple,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 5 // Max 5 files at once
  }
});

// Middleware para validar errores
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validar acceso al service
const validateServiceAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceId = req.params.serviceId || req.body.serviceId;
    
    if (!serviceId) {
      return res.status(400).json({ error: 'Service ID is required' });
    }

    const service = await AgencyService.findById(serviceId);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Verificar usuario tiene acceso (owner, admin, o operations)
    const userId = (req as any).user?._id || (req as any).user?.id;
    const userRole = (req as any).user?.role;
    
    const hasAccess = 
      service.createdBy?.toString() === userId?.toString() ||
      userRole === 'admin' ||
      userRole === 'operations';
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this service' });
    }
    
    (req as any).service = service;
    next();
  } catch (error) {
    console.error('Error validating service access:', error);
    return res.status(500).json({ 
      error: 'Error validating service access',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Validar límite de archivos por service
const validateFileLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = (req as any).service;
    
    if (!service) {
      return res.status(400).json({ error: 'Service validation required first' });
    }
    
    const currentFileCount = service.attachments?.length || 0;
    const newFileCount = (req as any).files ? ((req as any).files as any[]).length : 1;
    const totalFileCount = currentFileCount + newFileCount;
    
    if (totalFileCount > 5) {
      return res.status(400).json({ 
        error: `Cannot upload ${newFileCount} file(s). Service already has ${currentFileCount} file(s). Maximum 5 files allowed per service.`
      });
    }
    
    next();
  } catch (error) {
    console.error('Error validating file limit:', error);
    return res.status(500).json({ 
      error: 'Error validating file limit',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Validar que el service pueda ser editado
const validateServiceEditable = (req: Request, res: Response, next: NextFunction) => {
  const service = (req as any).service;
  
  if (!service) {
    return res.status(400).json({ error: 'Service validation required first' });
  }
  
  if (!service.canBeEdited()) {
    return res.status(400).json({ 
      error: `Service cannot be modified in status "${service.status}"` 
    });
  }
  
  next();
};

// Manejo de errores de Multer
const handleMulterError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ 
          error: 'File too large. Maximum 10MB allowed per file.' 
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ 
          error: 'Too many files. Maximum 5 files allowed.' 
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ 
          error: 'Unexpected file field. Use "file" for single upload or "files" for multiple.' 
        });
      default:
        return res.status(400).json({ 
          error: `Upload error: ${error.message}` 
        });
    }
  }
  
  if (error.message === 'Only PDF files are allowed') {
    return res.status(400).json({ 
      error: 'Only PDF files are allowed. Please upload valid PDF documents.' 
    });
  }
  
  next(error);
};

// Require admin for maintenance operations
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const userRole = (req as any).user?.role;
  
  if (userRole !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required for this operation' 
    });
  }
  
  next();
};

// Log file operations
const logFileOperation = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?._id || (req as any).user?.id;
    const serviceId = req.params.serviceId || req.body.serviceId;
    const fileName = req.params.fileName;
    
    console.log(`File ${operation}:`, {
      userId,
      serviceId,
      fileName,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
    
    next();
  };
};

// Validations
const uploadValidation = [
  body('serviceId').notEmpty().isMongoId()
    .withMessage('Valid service ID is required'),
  handleValidationErrors
];

const serviceIdValidation = [
  param('serviceId').isMongoId()
    .withMessage('Invalid service ID format'),
  handleValidationErrors
];

const fileNameValidation = [
  param('fileName').notEmpty().trim().isLength({ min: 1, max: 255 })
    .withMessage('Valid file name is required'),
  handleValidationErrors
];

const cleanupValidation = [
  query('dryRun').optional().isBoolean()
    .withMessage('dryRun must be boolean'),
  handleValidationErrors
];

// Todas las rutas requieren autenticación
router.use(jwtUtils);

// POST /api/agency/files/upload - Upload single PDF for service
router.post('/upload',
  requireAdminOrOperations,
  uploadLimiter,
  uploadValidation,
  validateServiceAccess,
  validateServiceEditable,
  validateFileLimit,
  uploadSingle.single('file'),
  handleMulterError,
  logFileOperation('upload'),
  catchedAsync(uploadServicePDF)
);

// POST /api/agency/files/bulk-upload - Upload multiple PDFs for service
router.post('/bulk-upload',
  requireAdminOrOperations,
  uploadLimiter,
  uploadValidation,
  validateServiceAccess,
  validateServiceEditable,
  validateFileLimit,
  uploadMultiple.array('files', 5),
  handleMulterError,
  logFileOperation('bulk-upload'),
  catchedAsync(bulkUploadServicePDFs)
);

// GET /api/agency/files/:serviceId - Get all files for a service
router.get('/:serviceId',
  requireAdminOrOperations,
  serviceIdValidation,
  validateServiceAccess,
  logFileOperation('list'),
  catchedAsync(getServiceFiles)
);

// GET /api/agency/files/download/:fileName - Download file
router.get('/download/:fileName',
  requireAdminOrOperations,
  downloadLimiter,
  fileNameValidation,
  logFileOperation('download'),
  catchedAsync(downloadServiceFile)
);

// GET /api/agency/files/view/:fileName - View file inline
router.get('/view/:fileName',
  requireAdminOrOperations,
  downloadLimiter,
  fileNameValidation,
  logFileOperation('view'),
  catchedAsync(viewServiceFile)
);

// DELETE /api/agency/files/:serviceId/:fileName - Delete specific file
router.delete('/:serviceId/:fileName',
  requireAdminOrOperations,
  serviceIdValidation,
  fileNameValidation,
  validateServiceAccess,
  validateServiceEditable,
  logFileOperation('delete'),
  catchedAsync(deleteServiceFile)
);

// POST /api/agency/files/cleanup - Cleanup orphaned files (ADMIN ONLY)
router.post('/cleanup',
  requireAdmin,
  cleanupValidation,
  logFileOperation('cleanup'),
  catchedAsync(cleanupOrphanedFiles)
);

export default router;