import { Router } from 'express';
import invoicesControllers from '../controllers/invoicesControllers/invoicesControllers';
import { jwtUtils } from "../middlewares/jwtUtils";

const { catchedAsync } = require('../utils');

const router = Router();

// Crear factura
router.post('/', jwtUtils, catchedAsync(invoicesControllers.createInvoice));

// Obtener todas las facturas
router.get('/', jwtUtils, catchedAsync(invoicesControllers.getAllInvoices));

// Obtener facturas por módulo
router.get('/module/:module', jwtUtils, catchedAsync(invoicesControllers.getInvoicesByModule));

// Obtener facturas por estado
router.get('/status/:status', jwtUtils, catchedAsync(invoicesControllers.getInvoicesByStatus));

// Obtener factura por ID
router.get('/:id', jwtUtils, catchedAsync(invoicesControllers.getInvoiceById));

// Actualizar factura
router.put('/:id', jwtUtils, catchedAsync(invoicesControllers.updateInvoice));

// Eliminar factura
router.delete('/:id', jwtUtils, catchedAsync(invoicesControllers.deleteInvoice));

// Enviar XML a SAP por FTP
router.post('/:invoiceId/send-xml-to-sap', jwtUtils, catchedAsync(invoicesControllers.sendXmlToSap));

// Test de conexión FTP
router.post('/test-ftp-connection', jwtUtils, catchedAsync(invoicesControllers.testFtpConnection));

// Debug de autenticación FTP
router.post('/debug-ftp-auth', jwtUtils, catchedAsync(invoicesControllers.debugFtpAuth));

export default router;