import { Request, Response } from 'express';
import xml2js from 'xml2js';
import fs from 'fs';
import path from 'path';

const { catchedAsync } = require('../../utils');
const AgencyService = require('../../database/schemas/agencyServiceSchema');

// Generar XML para SAP específico de Agency
export const generateSapXml = catchedAsync(async (req: Request, res: Response) => {
  const { serviceIds, invoiceDate, postingDate, invoiceNumber } = req.body;
  
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

  // Calcular total
  const totalAmount = services.reduce((sum: number, service: any) => {
    return sum + (service.price || 0);
  }, 0);

  // Generar estructura XML específica para Agency
  const xmlData = {
    Invoice: {
      // Header Mandatory Fields - Agency specific
      Protocol: 'LOCAL',
      SourceSystem: 'Agency Transportation System',
      TechnicalContact: 'E-almeida.kant@msc.com; E-renee.taylor@msc.com',
      CompanyCode: '9326',
      DocumentType: 'XL', // XL=Invoice
      DocumentDate: formatDateForSap(invoiceDate),
      PostingDate: formatDateForSap(postingDate || new Date()),
      TransactionCurrency: 'USD',
      Reference: invoiceNumber,
      EntityDocNbr: invoiceNumber,
      LongHeaderTextLangKey: 'EN',
      
      // Customer Section
      CustomerOpenItem: {
        CustomerNbr: 'MSC',
        AmntTransactCur: totalAmount.toFixed(3)
      },
      
      // Line Items - cada servicio de Agency
      OtherItems: services.map((service: any) => ({
        IncomeRebateCode: 'I', // Income
        AmntTransacCur: (service.price || 0).toFixed(3),
        ProfitCenter: 'SAP',
        Service: service.serviceCode || 'SHP243', // Usar serviceCode del servicio
        Activity: 'CLG',
        Pillar: 'LOGS',
        BUCountry: 'PAN',
        ServiceCountry: 'PAN',
        ClientType: 'THIRDP',
        // Campos adicionales específicos de Agency
        ServiceDescription: `${service.crewName} - ${service.vessel}`,
        Route: `${service.pickupLocation} to ${service.dropoffLocation}`,
        ServiceDate: formatDateForSap(service.pickupDate),
        CrewDetails: service.crewRank ? `${service.crewName} (${service.crewRank})` : service.crewName,
        TransportCompany: service.transportCompany || '',
        WaitingTime: service.waitingTime || 0,
        Voyage: service.voyage || '',
        Nationality: service.nationality || ''
      }))
    }
  };

  // Validar estructura XML
  const validation = validateXmlStructure(xmlData);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: 'XML validation failed',
      validationErrors: validation.errors
    });
  }

  // Convertir a XML con formato específico para Agency
  const builder = new xml2js.Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' },
    renderOpts: { pretty: true, indent: '  ' },
    rootName: 'Invoice',
    headless: false
  });
  
  const xmlString = builder.buildObject(xmlData);

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
  console.log(`Agency SAP XML generated: ${fileName}, Services updated: ${updateResult.modifiedCount}`);

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
      xmlValidation: validation
    },
    message: 'Agency SAP XML generated successfully and services marked as prefacturado'
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

export {
  generateSapXml,
  downloadSapXml, 
  getServicesReadyForInvoice,
  getSapXmlHistory,
  validateXmlStructure
};