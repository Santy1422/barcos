import { Request, Response } from 'express';
import xml2js from 'xml2js';
import fs from 'fs';
import path from 'path';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';
import AgencyService from '../../database/schemas/agencyServiceSchema';
import { getSftpConfigWithDebug, getFtpConfigWithDebug } from '../../config/sftpConfig';

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

  // Buscar servicios por IDs (pueden estar en cualquier estado ya que estamos enviando a SAP)
  const services = await AgencyService.find({
    _id: { $in: serviceIds }
  }).populate('clientId', 'name sapCode');

  if (services.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No services found for the provided IDs'
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
  console.log('🚀 sendXmlToSap controller called for Agency');
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

  // Buscar servicios por IDs (pueden estar en cualquier estado ya que estamos enviando a SAP)
  const services = await AgencyService.find({
    _id: { $in: serviceIds }
  }).populate('clientId', 'name sapCode');

  if (services.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No services found for the provided IDs'
    });
  }

  // Logs para el proceso de envío
  const logs: any[] = [];

  const addLog = (level: 'info' | 'success' | 'error' | 'warning', message: string, data?: any) => {
    const logEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    logs.push(logEntry);
    console.log(`[Agency FTP ${level.toUpperCase()}] ${message}`, data || '');
  };

  addLog('info', 'Iniciando proceso de envío FTP para Agency', {
    fileName,
    xmlLength: xmlContent.length,
    serviceCount: serviceIds.length,
    servicesFound: services.length
  });

  try {
    // Obtener configuración FTP específica para Agency
    const ftpConfig = getFtpConfigWithDebug();
    addLog('info', 'Configuración FTP cargada', {
      host: ftpConfig.host,
      username: ftpConfig.username,
      path: ftpConfig.path,
      port: ftpConfig.port
    });

    // Crear nombre del archivo XML (compatible con FTP)
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')  // Reemplazar : y . por -
      .replace(/T/g, '_')     // Reemplazar T por _
      .replace(/Z/g, '');     // Remover Z del final
    const finalFileName = fileName || `agency_${timestamp}.xml`;

    addLog('info', 'Archivo a enviar', {
      originalFileName: fileName,
      finalFileName: finalFileName,
      timestamp: timestamp
    });

    const client = new ftp.Client();
    client.ftp.verbose = false;
    
    // Declarar uploadedFileName en el alcance correcto
    let uploadedFileName = finalFileName;

    try {
      // Conectar al servidor FTP usando configuración específica
      addLog('info', 'Conectando al servidor FTP', {
        host: ftpConfig.host,
        port: ftpConfig.port,
        user: ftpConfig.username,
        passwordLength: ftpConfig.password.length,
        secure: false
      });

      await client.access({
        host: ftpConfig.host,
        port: ftpConfig.port, // Usar puerto específico de FTP
        user: ftpConfig.username,
        password: ftpConfig.password,
        secure: false // FTP tradicional no seguro
      });

      addLog('success', 'Conexión FTP establecida');

      // Pequeño retraso para estabilizar la conexión
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Cambiar al directorio de destino especificado en SAP_FTP_PATH
      const targetPath = ftpConfig.path;
      addLog('info', 'Navegando al directorio de destino', { targetPath });
      
      try {
        await client.cd(targetPath);
        addLog('success', 'Directorio de destino alcanzado');
      } catch (cdError: any) {
        addLog('error', 'Error al cambiar directorio', { 
          targetPath, 
          error: cdError.message 
        });
        throw new Error(`No se pudo acceder al directorio: ${targetPath}`);
      }

      // Listar contenido del directorio (para verificar)
      addLog('info', 'Verificando contenido del directorio...');
      try {
        const list = await client.list();
        addLog('success', 'Directorio listado exitosamente', { 
          fileCount: list.length 
        });
      } catch (listError: any) {
        addLog('warning', 'No se pudo listar el directorio', { 
          error: listError.message 
        });
      }

      // Subir archivo al directorio correcto
      const xmlBuffer = Buffer.from(xmlContent, 'utf8');
      const xmlStream = Readable.from(xmlBuffer);

      addLog('info', 'Subiendo archivo XML...', {
        fileName: finalFileName,
        fileSize: xmlBuffer.length,
        targetPath: targetPath,
        xmlPreview: xmlContent.substring(0, 200) + '...' // Primeros 200 caracteres
      });

      try {
        // Intentar subir con opciones adicionales
        await client.uploadFrom(xmlStream, finalFileName);
        addLog('success', 'Archivo XML subido exitosamente');
      } catch (uploadError: any) {
        addLog('error', 'Error con uploadFrom, intentando con upload', {
          error: uploadError.message,
          code: uploadError.code,
          fileName: finalFileName,
          bufferLength: xmlBuffer.length
        });

        // Intentar con método alternativo upload
        try {
          await client.upload(xmlStream, finalFileName);
          addLog('success', 'Archivo XML subido exitosamente con método alternativo');
        } catch (altError: any) {
          addLog('error', 'Error con ambos métodos de subida', {
            uploadFromError: uploadError.message,
            uploadError: altError.message,
            fileName: finalFileName
          });

          // Intentar con un nombre de archivo más simple como último recurso
          const simpleFileName = `agency_${Date.now()}.xml`;
          addLog('warning', `Último intento con nombre simplificado: ${simpleFileName}`);

          try {
            await client.upload(xmlStream, simpleFileName);
            addLog('success', 'Archivo XML subido exitosamente con nombre alternativo');

            // Usar el nombre alternativo para el resto del proceso
            uploadedFileName = simpleFileName;
          } catch (finalError: any) {
            addLog('error', 'Error incluso con nombre alternativo', {
              error: finalError.message,
              code: finalError.code,
              fileName: simpleFileName
            });
            throw finalError;
          }
        }
      }

      // Verificar que el archivo se subió correctamente (opcional)
      try {
        const fileList = await client.list();
        const uploadedFile = fileList.find(file => file.name === uploadedFileName);
        if (uploadedFile) {
          addLog('success', 'Archivo verificado', { fileSize: uploadedFile.size });
        } else {
          addLog('info', 'Archivo subido pero no se pudo verificar en listado');
        }
      } catch (verifyError: any) {
        addLog('info', 'No se pudo verificar el archivo (operación opcional)', { error: verifyError.message });
      }

      client.close();

      // Marcar servicios como enviados a SAP
      const updateResult = await AgencyService.updateMany(
        { _id: { $in: serviceIds } },
        {
          sentToSap: true,
          sentToSapAt: new Date(),
          sapFileName: uploadedFileName,
          updatedAt: new Date()
        }
      );

      addLog('success', 'Servicios actualizados en base de datos', {
        servicesMarked: updateResult.modifiedCount
      });

      console.log(`✅ Agency XML sent to SAP: ${uploadedFileName}, Services marked: ${updateResult.modifiedCount}`);

      return res.json({
        success: true,
        message: 'XML enviado a SAP exitosamente vía FTP',
        logs,
        data: {
          fileName: uploadedFileName,
          originalFileName: fileName,
          servicesMarked: updateResult.modifiedCount,
          protocol: 'FTP',
          sentAt: new Date().toISOString()
        }
      });

      } catch (ftpError: any) {
        const errorMessage = ftpError?.message || 'Error en conexión FTP';
        const errorCode = ftpError?.code || 'UNKNOWN';

        addLog('error', 'Error en conexión FTP', {
          error: errorMessage,
          code: errorCode
        });

        client.close();

        // Mensaje más amigable para el usuario
        let userMessage = 'Error al conectar con el servidor FTP de SAP';
        if (errorMessage.includes('501')) {
          userMessage = 'Error de sintaxis en comandos FTP. Verifique la configuración del servidor.';
        } else if (errorMessage.includes('Connection')) {
          userMessage = 'No se pudo conectar al servidor FTP. Verifique la conexión de red.';
        } else if (errorMessage.includes('Authentication') || errorMessage.includes('Login')) {
          userMessage = 'Error de autenticación. Verifique usuario y contraseña.';
        }

        return res.status(500).json({
          success: false,
          message: userMessage,
          error: errorMessage,
          logs,
          details: {
            errorCode,
            fullError: errorMessage
          }
        });
      }
    
  } catch (error: any) {
    console.error('❌ Error sending Agency XML to SAP:', error);
    
    const errorMessage = error?.message || 'Error desconocido';
    
    addLog('error', 'Error crítico al enviar XML', { 
      error: errorMessage
    });

    return res.status(500).json({
      success: false,
      message: 'Error crítico al procesar el envío a SAP',
      error: errorMessage,
      logs,
      details: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } : String(error)
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

