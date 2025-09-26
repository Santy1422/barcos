import { Router } from 'express';
import {
  getPricingConfigs,
  getActiveConfig,
  getPricingConfigById,
  createPricingConfig,
  updatePricingConfig,
  deletePricingConfig,
  clonePricingConfig,
  calculatePrice,
  importFromSeed
} from '../controllers/agencyControllers/agencyPricingConfigControllers';
import { authenticateToken } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { body, param, query } from 'express-validator';

const router = Router();

// Validaciones
const createConfigValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('code').notEmpty().withMessage('Code is required').isUppercase(),
  body('minimumPrice').isNumeric().withMessage('Minimum price must be a number'),
  body('baseFee').isNumeric().withMessage('Base fee must be a number'),
  body('distanceRates').isArray().withMessage('Distance rates must be an array'),
  body('distanceRates.*.minKm').isNumeric(),
  body('distanceRates.*.maxKm').isNumeric(),
  body('distanceRates.*.ratePerKm').isNumeric()
];

const updateConfigValidation = [
  param('id').isMongoId().withMessage('Invalid configuration ID'),
  ...createConfigValidation.map(validation => validation.optional())
];

const calculatePriceValidation = [
  body('from').notEmpty().withMessage('From location is required'),
  body('to').notEmpty().withMessage('To location is required'),
  body('passengerCount').optional().isInt().withMessage('Passenger count must be a positive integer'),
  body('waitingHours').optional().isNumeric().withMessage('Waiting hours must be a positive number')
];

// Rutas públicas (solo lectura)
router.get('/active', getActiveConfig);
router.post('/calculate', calculatePriceValidation, validateRequest, calculatePrice);

// Rutas protegidas
router.use(authenticateToken);

// CRUD de configuraciones
router.get('/', getPricingConfigs);
router.get('/:id', getPricingConfigById);
router.post('/', createConfigValidation, validateRequest, createPricingConfig);
router.put('/:id', updateConfigValidation, validateRequest, updatePricingConfig);
router.delete('/:id', deletePricingConfig);

// Acciones especiales
router.post('/:id/clone', clonePricingConfig);
router.post('/import/seed', importFromSeed);

export default router;