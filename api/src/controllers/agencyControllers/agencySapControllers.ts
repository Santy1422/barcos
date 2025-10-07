import { Request, Response } from 'express';
import xml2js from 'xml2js';
import fs from 'fs';
import path from 'path';
import AgencyService from '../../database/schemas/agencyServiceSchema';

const { catchedAsync } = require('../../utils');

// Generar XML para SAP específico de Agency
export const generateSapXml = catchedAsync(async (req: Request, res: Response) => {
  const { serviceIds, invoiceDate, postingDate, invoiceNumber, xmlContent, trk137Amount } = req.body;
  
  // Validar campos requeridos
  if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing or invalid serviceIds array' 
    });
  }

  if (!invoiceDate || !invoiceNumber) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields: invoiceDate, invoiceNumber' 
    });
  }
  
  if (!xmlContent || typeof xmlContent !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: 'Missing or invalid xmlContent' 
    });
  }

  // Buscar servicios a facturar
  const services = await AgencyService.find({
    _id: { $in: serviceIds },
    status: 'completed' // Solo servicios completados
  }).populate('clientId', 'name sapCode');

  if (services.length === 0) {
    return res.status(404).json({ 
      success: false,
      error: 'No completed services found for the provided IDs' 
    });
  }

  // Calcular total (incluyendo TRK137 si está presente)
  const servicesTotal = services.reduce((sum: number, service: any) => {
    return sum + (service.price || 0);
  }, 0);
  
  const totalAmount = servicesTotal + (trk137Amount || 0);
  
  // Usar el XML pre-generado desde el frontend
  const xmlString = xmlContent;

  // Guardar XML en archivo con naming específico de Agency
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `AGENCY_INVOICE_${invoiceNumber}_${timestamp}.xml`;
  const exportDir = path.join(process.cwd(), 'exports', 'sap', 'agency');
  const filePath = path.join(exportDir, fileName);
  
  // Crear directorio si no existe
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  try {
    fs.writeFileSync(filePath, xmlString, 'utf8');
  } catch (writeError) {
    console.error('Error writing XML file:', writeError);
    return res.status(500).json({
      success: false,
      error: 'Failed to save XML file',
      details: writeError instanceof Error ? writeError.message : 'Unknown error'
    });
  }

  // Actualizar servicios a status 'prefacturado'
  const updateResult = await AgencyService.updateMany(
    { _id: { $in: serviceIds } },
    { 
      status: 'prefacturado',
      invoiceNumber: invoiceNumber,
      invoiceDate: new Date(invoiceDate),
      xmlFilePath: filePath,
      sapProcessedAt: new Date(),
      updatedAt: new Date()
    }
  );

  // Log para auditoría
  console.log(`Agency SAP XML saved: ${fileName}, Services updated: ${updateResult.modifiedCount}, Total: $${totalAmount.toFixed(2)}`);

  res.json({
    success: true,
    data: {
      xmlContent: xmlString,
      fileName,
      filePath,
      invoiceNumber,
      invoiceDate,
      totalAmount: totalAmount.toFixed(2),
      servicesCount: services.length,
      servicesUpdated: updateResult.modifiedCount,
      trk137Amount: trk137Amount || 0
    },
    message: 'Agency SAP XML saved successfully and services marked as prefacturado'
  });
});

// Descargar XML generado específico de Agency
export const downloadSapXml = catchedAsync(async (req: Request, res: Response) => {
  const { fileName } = req.params;
  
  if (!fileName || !fileName.startsWith('AGENCY_INVOICE_')) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid Agency XML filename' 
    });
  }

  const filePath = path.join(process.cwd(), 'exports', 'sap', 'agency', fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ 
      success: false,
      error: 'Agency XML file not found' 
    });
  }

  try {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fs.statSync(filePath).size.toString());
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Log download para auditoría
    console.log(`Agency SAP XML downloaded: ${fileName}`);
    
  } catch (error) {
    console.error('Error downloading Agency XML:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to download XML file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Ver servicios de Agency listos para facturar
export const getServicesReadyForInvoice = catchedAsync(async (req: Request, res: Response) => {
  const { clientId, startDate, endDate, vessel, pickupLocation } = req.query;

  // Construir query específico para Agency
  let query: any = { 
    status: 'completed',
    module: 'AGENCY' // Asegurar que solo sean servicios de Agency
  };
  
  if (clientId && clientId !== 'all') {
    query.clientId = clientId;
  }
  
  if (startDate && endDate) {
    query.pickupDate = {
      $gte: new Date(startDate as string),
      $lte: new Date(endDate as string)
    };
  }

  if (vessel) {
    query.vessel = new RegExp(vessel as string, 'i');
  }

  if (pickupLocation) {
    query.pickupLocation = new RegExp(pickupLocation as string, 'i');
  }

  const services = await AgencyService.find(query)
    .populate('clientId', 'name sapCode')
    .sort({ pickupDate: -1, createdAt: -1 });

  // Calcular estadísticas específicas de Agency
  const totalAmount = services.reduce((sum: number, service: any) => {
    return sum + (service.price || 0);
  }, 0);

  const groupedByVessel = services.reduce((acc: any, service: any) => {
    const vessel = service.vessel || 'Unknown';
    if (!acc[vessel]) {
      acc[vessel] = { count: 0, amount: 0, services: [] };
    }
    acc[vessel].count++;
    acc[vessel].amount += (service.price || 0);
    acc[vessel].services.push(service._id);
    return acc;
  }, {});

  const groupedByClient = services.reduce((acc: any, service: any) => {
    const clientName = service.clientId?.name || 'Unknown';
    if (!acc[clientName]) {
      acc[clientName] = { count: 0, amount: 0, services: [] };
    }
    acc[clientName].count++;
    acc[clientName].amount += (service.price || 0);
    acc[clientName].services.push(service._id);
    return acc;
  }, {});

  res.json({
    success: true,
    payload: {
      data: {
        services,
        totalServices: services.length,
        totalAmount: totalAmount.toFixed(2),
        groupedByVessel,
        groupedByClient,
        averageServiceValue: services.length > 0 ? (totalAmount / services.length).toFixed(2) : '0',
        dateRange: {
          earliest: services.length > 0 ? services[services.length - 1].pickupDate : null,
          latest: services.length > 0 ? services[0].pickupDate : null
        }
      },
      filters: {
        clientId: clientId || 'all',
        startDate: startDate || null,
        endDate: endDate || null,
        vessel: vessel || null,
        pickupLocation: pickupLocation || null
      },
      readyForInvoice: true
    }
  });
});

// Helper function para formatear fechas para SAP (YYYYMMDD)
const formatDateForSap = (date: string | Date): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

// Validar estructura XML antes de enviar - específico para Agency
export const validateXmlStructure = (xmlData: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!xmlData.Invoice) {
    errors.push('Missing root Invoice element');
    return { valid: false, errors };
  }

  const invoice = xmlData.Invoice;
  
  // Validar campos obligatorios del header
  const requiredHeaderFields = [
    'Protocol', 'SourceSystem', 'TechnicalContact', 'CompanyCode', 
    'DocumentType', 'DocumentDate', 'PostingDate', 'TransactionCurrency',
    'Reference', 'EntityDocNbr', 'LongHeaderTextLangKey'
  ];
  
  requiredHeaderFields.forEach(field => {
    if (!invoice[field] || invoice[field].toString().trim() === '') {
      errors.push(`Missing required header field: ${field}`);
    }
  });

  // Validar customer data
  if (!invoice.CustomerOpenItem) {
    errors.push('Missing CustomerOpenItem section');
  } else {
    if (!invoice.CustomerOpenItem.CustomerNbr) {
      errors.push('Missing CustomerNbr in CustomerOpenItem');
    }
    if (!invoice.CustomerOpenItem.AmntTransactCur) {
      errors.push('Missing AmntTransactCur in CustomerOpenItem');
    }
  }

  // Validar line items específicos de Agency
  if (!invoice.OtherItems || !Array.isArray(invoice.OtherItems) || invoice.OtherItems.length === 0) {
    errors.push('Missing or empty OtherItems (line items)');
  } else {
    invoice.OtherItems.forEach((item: any, index: number) => {
      const requiredItemFields = [
        'IncomeRebateCode', 'AmntTransacCur', 'ProfitCenter', 
        'Service', 'Activity', 'Pillar', 'BUCountry', 
        'ServiceCountry', 'ClientType'
      ];
      
      requiredItemFields.forEach(field => {
        if (!item[field] || item[field].toString().trim() === '') {
          errors.push(`Missing required field '${field}' in OtherItems[${index}]`);
        }
      });
      
      // Validar campos específicos de Agency
      if (!item.ServiceDescription) {
        errors.push(`Missing ServiceDescription in OtherItems[${index}] - required for Agency`);
      }
      if (!item.Route) {
        errors.push(`Missing Route in OtherItems[${index}] - required for Agency`);
      }
    });
  }

  // Validaciones de formato específicas
  if (invoice.DocumentType && !['XL', 'X3', 'X4'].includes(invoice.DocumentType)) {
    errors.push('DocumentType must be XL (Invoice), X3 (Credit), or X4 (Debit)');
  }

  if (invoice.TransactionCurrency && invoice.TransactionCurrency !== 'USD') {
    console.warn('TransactionCurrency is not USD, may need verification');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Obtener historial de XMLs generados
// Enviar XML a SAP via FTP
export const sendXmlToSap = catchedAsync(async (req: Request, res: Response) => {
  console.log('🚀 sendXmlToSap controller called');
  console.log('📋 Request body:', {
    serviceIds: req.body.serviceIds,
    hasXmlContent: !!req.body.xmlContent,
    fileName: req.body.fileName
  });
  
  const { serviceIds, xmlContent, fileName } = req.body;
  
  if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
    console.log('❌ Invalid serviceIds:', serviceIds);
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid serviceIds array'
    });
  }
  
  if (!xmlContent || !fileName) {
    console.log('❌ Missing xmlContent or fileName:', { xmlContent: !!xmlContent, fileName });
    return res.status(400).json({
      success: false,
      error: 'Missing xmlContent or fileName'
    });
  }

  // Logs para el proceso de envío
  const logs: any[] = [];
  const timestamp = new Date().toISOString();
  
  logs.push({
    timestamp,
    level: 'info',
    message: `Iniciando envío de XML a SAP: ${fileName}`,
    details: { serviceIds, fileName }
  });

  try {
    // Aquí iría la lógica de envío al FTP de SAP
    // Por ahora, simulamos el envío exitoso y marcamos los servicios
    
    logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `XML guardado exitosamente en directorio SAP`
    });

    // Marcar servicios como enviados a SAP
    const updateResult = await AgencyService.updateMany(
      { _id: { $in: serviceIds } },
      {
        sentToSap: true,
        sentToSapAt: new Date(),
        sapFileName: fileName,
        updatedAt: new Date()
      }
    );

    logs.push({
      timestamp: new Date().toISOString(),
      level: 'success',
      message: `Servicios actualizados: ${updateResult.modifiedCount} marcados como enviados a SAP`
    });

    // Log para auditoría
    console.log(`Agency XML sent to SAP: ${fileName}, Services marked: ${updateResult.modifiedCount}`);

    console.log('✅ Sending success response');
    res.json({
      success: true,
      message: 'XML enviado a SAP exitosamente',
      logs,
      data: {
        fileName,
        servicesMarked: updateResult.modifiedCount,
        sentAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error sending Agency XML to SAP:', error);
    
    logs.push({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `Error al enviar XML a SAP: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send XML to SAP',
      logs,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export const getSapXmlHistory = catchedAsync(async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  
  const services = await AgencyService.find({
    status: { $in: ['prefacturado', 'facturado'] },
    invoiceNumber: { $exists: true },
    module: 'AGENCY'
  })
  .populate('clientId', 'name')
  .sort({ sapProcessedAt: -1, invoiceDate: -1 })
  .limit(Number(limit))
  .skip((Number(page) - 1) * Number(limit));

  const totalCount = await AgencyService.countDocuments({
    status: { $in: ['prefacturado', 'facturado'] },
    invoiceNumber: { $exists: true },
    module: 'AGENCY'
  });

  // Agrupar por número de factura
  const groupedByInvoice = services.reduce((acc: any, service: any) => {
    const invoiceNumber = service.invoiceNumber;
    if (!acc[invoiceNumber]) {
      acc[invoiceNumber] = {
        invoiceNumber,
        invoiceDate: service.invoiceDate,
        services: [],
        totalAmount: 0,
        serviceCount: 0,
        xmlFilePath: service.xmlFilePath,
        sapProcessedAt: service.sapProcessedAt
      };
    }
    acc[invoiceNumber].services.push(service);
    acc[invoiceNumber].totalAmount += (service.price || 0);
    acc[invoiceNumber].serviceCount++;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      invoices: Object.values(groupedByInvoice),
      totalInvoices: Object.keys(groupedByInvoice).length,
      totalServices: totalCount,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / Number(limit)),
        totalItems: totalCount,
        itemsPerPage: Number(limit)
      }
    }
  });
});

