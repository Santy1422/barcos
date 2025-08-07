import { Router } from 'express';
import invoicesControllers from '../controllers/invoicesControllers/invoicesControllers';
import { jwtUtils } from "../middlewares/jwtUtils";
import { sendXmlToSapSftp } from '../controllers/invoicesControllers/sendXmlToSapSftp';
import { sendXmlToSapFtp } from '../controllers/invoicesControllers/sendXmlToSapFtp';
import { testSftpConnection } from '../controllers/invoicesControllers/testSftpConnection';
import { testFtpConnection } from '../controllers/invoicesControllers/testFtpConnection';

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

// Diagnóstico híbrido FTP/SFTP
router.post('/diagnose-ftp-server', jwtUtils, catchedAsync(invoicesControllers.diagnoseFtpServer));

// Enviar XML a SAP por SFTP
router.post('/:invoiceId/send-xml-to-sap-sftp', jwtUtils, catchedAsync(sendXmlToSapSftp));

// Enviar XML a SAP por FTP tradicional
router.post('/:invoiceId/send-xml-to-sap-ftp', jwtUtils, catchedAsync(sendXmlToSapFtp));

// Test de conexión SFTP
router.post('/test-sftp-connection', jwtUtils, catchedAsync(testSftpConnection));

// Test de conexión FTP tradicional
router.post('/test-ftp-traditional', jwtUtils, catchedAsync(testFtpConnection));

// Marcar XML como enviado a SAP
router.patch('/:id/mark-xml-sent-to-sap', jwtUtils, catchedAsync(invoicesControllers.markXmlAsSentToSap));

// Marcar XML como enviado a SAP (versión simple con múltiples estrategias)
router.patch('/:id/mark-xml-sent-to-sap-simple', jwtUtils, catchedAsync(invoicesControllers.markXmlAsSentToSapSimple));

export default router;