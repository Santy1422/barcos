import { Request, Response } from 'express';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';
import { getSftpConfigWithDebug } from '../../config/sftpConfig';
import { invoices } from '../../database';

export const sendXmlToSapFtp = async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const { xmlContent, fileName } = req.body;
    
    console.log(`\n📤 === ENVIANDO XML A SAP VÍA FTP TRADICIONAL ===`);
    console.log(`Invoice ID: ${invoiceId}`);

    // Validar parámetros
    if (!invoiceId || !xmlContent || !fileName) {
      return res.status(400).json({
        success: false,
        message: "Faltan parámetros requeridos (invoiceId, xmlContent, fileName)"
      });
    }

    const logs: any[] = [];
    
    const addLog = (level: 'info' | 'success' | 'error' | 'warning', message: string, data?: any) => {
      const logEntry = {
        level,
        message,
        data,
        timestamp: new Date().toISOString()
      };
      logs.push(logEntry);
      console.log(`[FTP ${level.toUpperCase()}] ${message}`, data || '');
    };

    addLog('info', 'Iniciando proceso de envío FTP', { 
      invoiceId, 
      fileName, 
      xmlLength: xmlContent.length 
    });

    // Buscar la factura en la base de datos
    const invoice = await invoices.findById(invoiceId);
    if (!invoice) {
      addLog('error', 'Factura no encontrada', { invoiceId });
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada',
        logs
      });
    }

    addLog('info', 'Factura encontrada', { 
      invoiceNumber: invoice.invoiceNumber, 
      status: invoice.status 
    });

    addLog('info', 'XML Content Length', { xmlLength: xmlContent.length });

    // Obtener configuración FTP
    const ftpConfig = getSftpConfigWithDebug();
    addLog('info', 'Configuración FTP cargada', {
      host: ftpConfig.host,
      username: ftpConfig.username,
      path: ftpConfig.path
    });

    // Crear nombre del archivo XML
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalFileName = fileName || `invoice_${invoiceId}_${timestamp}.xml`;
    
    addLog('info', 'Archivo a enviar', { fileName: finalFileName });

    const client = new ftp.Client();
    client.ftp.verbose = false; // Deshabilitar logs detallados para producción
    
    try {
      // Conectar al servidor FTP
      addLog('info', 'Conectando al servidor FTP', { 
        host: ftpConfig.host, 
        port: 21 
      });
      await client.access({
        host: ftpConfig.host,
        port: 21, // Puerto FTP estándar
        user: ftpConfig.username,
        password: ftpConfig.password,
        secure: false // FTP no seguro
      });
      
      addLog('success', 'Conexión FTP establecida');

      // Verificar y crear directorio si es necesario
      try {
        await client.cd(ftpConfig.path);
        addLog('success', 'Directorio de destino verificado');
      } catch (cdError: any) {
        addLog('warning', 'Directorio no existe, creando...');
        await client.ensureDir(ftpConfig.path);
        addLog('success', 'Directorio de destino creado');
      }

      // Convertir XML a stream y subir
      const xmlBuffer = Buffer.from(xmlContent, 'utf8');
      const xmlStream = Readable.from(xmlBuffer);
      
      addLog('info', 'Subiendo archivo XML...');
      await client.uploadFrom(xmlStream, finalFileName);
      addLog('success', 'Archivo XML subido exitosamente');

      // Verificar que el archivo se subió correctamente
      try {
        const fileList = await client.list();
        const uploadedFile = fileList.find(file => file.name === finalFileName);
        if (uploadedFile) {
          addLog('success', 'Archivo verificado', { fileSize: uploadedFile.size });
        } else {
          addLog('warning', 'No se pudo verificar el archivo subido');
        }
      } catch (verifyError: any) {
        addLog('warning', 'No se pudo verificar el archivo', { error: verifyError.message });
      }

      client.close();

      // Actualizar la factura en la base de datos
      await invoice.updateOne({
        sentToSap: true,
        sentToSapAt: new Date(),
        sapFileName: finalFileName,
        sapProtocol: 'FTP'
      });

      addLog('success', 'Factura actualizada en base de datos');

      return res.json({
        success: true,
        message: 'XML enviado a SAP exitosamente vía FTP',
        logs,
        data: {
          invoiceId,
          fileName: finalFileName,
          protocol: 'FTP',
          sentAt: new Date().toISOString()
        }
      });

    } catch (ftpError: any) {
      addLog('error', 'Error en conexión FTP', { error: ftpError.message });
      client.close();
      
      return res.status(500).json({
        success: false,
        message: 'Error al enviar XML a SAP vía FTP',
        logs,
        error: {
          name: ftpError.name,
          message: ftpError.message
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Error en sendXmlToSapFtp:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || "Error interno del servidor",
      logs: [],
      error: {
        name: error.name,
        message: error.message
      }
    });
  }
}; 