import { Router } from 'express';
import { jwtUtils } from '../middlewares/jwtUtils';
import {
  getAllAgencyInvoices,
  getAgencyInvoiceById,
  createAgencyInvoice,
  updateAgencyInvoice,
  deleteAgencyInvoice,
  facturarAgencyInvoice
} from '../controllers/agencyControllers/agencyInvoicesControllers';

const router = Router();

// All routes require authentication
router.use(jwtUtils);

/**
 * @route   GET /api/agency/invoices
 * @desc    Get all agency invoices with filters
 * @access  Private
 */
router.get('/', getAllAgencyInvoices);

/**
 * @route   GET /api/agency/invoices/:id
 * @desc    Get single agency invoice by ID
 * @access  Private
 */
router.get('/:id', getAgencyInvoiceById);

/**
 * @route   POST /api/agency/invoices
 * @desc    Create new agency invoice (prefactura)
 * @access  Private
 */
router.post('/', createAgencyInvoice);

/**
 * @route   PUT /api/agency/invoices/:id
 * @desc    Update agency invoice
 * @access  Private
 */
router.put('/:id', updateAgencyInvoice);

/**
 * @route   DELETE /api/agency/invoices/:id
 * @desc    Delete agency invoice
 * @access  Private
 */
router.delete('/:id', deleteAgencyInvoice);

/**
 * @route   POST /api/agency/invoices/:id/facturar
 * @desc    Convert prefactura to factura and generate XML
 * @access  Private
 */
router.post('/:id/facturar', facturarAgencyInvoice);

export default router;

