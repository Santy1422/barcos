import { body, param, query, validationResult } from 'express-validator';
import { response } from '../utils';

// Middleware para manejar errores de validación
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response(res, 400, { 
      error: 'Datos de entrada inválidos', 
      details: errors.array() 
    });
  }
  next();
};

// Validaciones para clientes
export const validateClient = [
  body('type').isIn(['natural', 'juridical']).withMessage('Tipo debe ser natural o juridical'),
  body('email').isEmail().withMessage('Email inválido'),
  body('phone').optional().isMobilePhone('any').withMessage('Teléfono inválido'),
  handleValidationErrors
];

// Validaciones para facturas
export const validateInvoice = [
  body('module').isIn(['trucking', 'shipchandler', 'agency']).withMessage('Módulo inválido'),
  body('invoiceNumber').notEmpty().withMessage('Número de factura requerido'),
  body('totalAmount').isNumeric().withMessage('Monto total debe ser numérico'),
  body('issueDate').isISO8601().withMessage('Fecha de emisión inválida'),
  handleValidationErrors
];

// Validaciones para registros
export const validateRecord = [
  body('module').isIn(['trucking', 'shipchandler', 'agency']).withMessage('Módulo inválido'),
  body('type').notEmpty().withMessage('Tipo requerido'),
  body('totalValue').isNumeric().withMessage('Valor total debe ser numérico'),
  handleValidationErrors
];