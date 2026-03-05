import { Client as FtpClient } from 'basic-ftp';
import { Request, Response } from 'express';
import { Readable } from 'stream';
import { invoices } from '../../database';
import { getFtpConfigWithDebug } from '../../config/ftpConfig';
import { ErrorLog } from '../../database/schemas/errorLogSchema';

interface LogEntry {
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
  timestamp: string;
}

// Función auxiliar para guardar logs en MongoDB
const saveLogToMongo = async (
  level: 'error' | 'warning' | 'info',
  action: string,
  message: string,
  metadata?: any,
  req?: Request
) => {
  try {
    await ErrorLog.create({
      level,
      module: 'ftp-sap',
      action,
      message,
      userId: (req as any)?.user?._id?.toString(),
      userEmail: (req as any)?.user?.email,
      requestData: req ? {
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        query: req.query
      } : undefined,
      metadata
    });
  } catch (err) {
    console.error('Error guardando log en MongoDB:', err);
  }
};

export const sendXmlToSap = async (req: Request, res: Response) => {
  try {
    console.log('\n🚀 === INICIANDO ENVÍO XML A SAP VIA FTP ===');

    const { invoiceId } = req.params;
    const { xmlContent, fileName } = req.body;

    // Log inicio en MongoDB
    await saveLogToMongo('info', 'ftp-upload-start', `Iniciando envío FTP para factura ${invoiceId}`, {
      invoiceId,
      fileName,
      xmlLength: xmlContent?.length
    }, req);

    // Validar parámetros
    if (!invoiceId || !xmlContent || !fileName) {
      await saveLogToMongo('error', 'ftp-validation-error', 'Faltan parámetros requeridos', {
        invoiceId: !!invoiceId,
        xmlContent: !!xmlContent,
        fileName: !!fileName
      }, req);
      return res.status(400).json({
        success: false,
        message: "Faltan parámetros requeridos (invoiceId, xmlContent, fileName)"
      });
    }

    const logs: LogEntry[] = [];

    const addLog = async (level: LogEntry['level'], message: string, data?: any) => {
      const logEntry: LogEntry = {
        level,
        message,
        data,
        timestamp: new Date().toISOString()
      };
      logs.push(logEntry);
      console.log(`[FTP ${level.toUpperCase()}] ${message}`, data || '');

      // Guardar en MongoDB si es error o warning
      if (level === 'error' || level === 'warning') {
        await saveLogToMongo(level, `ftp-${level}`, message, { ...data, invoiceId }, req);
      }
    };

    await addLog('info', 'Iniciando proceso de envío FTP', {
      invoiceId,
      fileName,
      xmlLength: xmlContent.length
    });

    // Buscar la factura
    const invoice = await invoices.findById(invoiceId);
    if (!invoice) {
      await addLog('error', 'Factura no encontrada', { invoiceId });
      return res.status(404).json({
        success: false,
        message: "Factura no encontrada",
        logs
      });
    }

    await addLog('info', 'Factura encontrada', {
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status
    });

    // Configuración FTP desde variables de entorno
    const ftpConfig = getFtpConfigWithDebug();

    await addLog('info', 'Configurando conexión FTP', {
      host: ftpConfig.host,
      user: ftpConfig.user,
      port: 21,
      passwordLength: ftpConfig.password?.length || 0,
      passwordPresent: !!ftpConfig.password,
      configPath: ftpConfig.path
    });

    const client = new FtpClient();

    // Configurar debug y timeouts
    client.ftp.verbose = true;

    try {
      // Conectar al servidor FTP
      await addLog('info', 'Conectando al servidor FTP...', {
        host: ftpConfig.host,
        port: 21,
        user: ftpConfig.user
      });

      await client.access({
        host: ftpConfig.host,
        user: ftpConfig.user,
        password: ftpConfig.password,
        secure: false // FTP tradicional sin cifrado
      });

      await addLog('success', 'Conexión FTP establecida exitosamente');

      // Cambiar al directorio de destino
      const targetPath = ftpConfig.path;
      await addLog('info', 'Navegando al directorio de destino', { targetPath });

      try {
        await client.cd(targetPath);
        await addLog('success', 'Directorio de destino alcanzado');
      } catch (cdError: any) {
        await addLog('error', 'Error al cambiar directorio', {
          targetPath,
          error: cdError.message
        });
        throw new Error(`No se pudo acceder al directorio: ${targetPath}`);
      }

      // Listar contenido del directorio (para verificar)
      await addLog('info', 'Verificando contenido del directorio...');
      try {
        const list = await client.list();
        await addLog('success', 'Directorio listado exitosamente', {
          fileCount: list.length
        });
      } catch (listError: any) {
        await addLog('warning', 'No se pudo listar el directorio', {
          error: listError.message
        });
      }

      // Crear el buffer del archivo XML
      await addLog('info', 'Preparando archivo XML para subida', {
        fileName,
        fileSize: Buffer.byteLength(xmlContent, 'utf8')
      });

      // Subir el archivo XML
      await addLog('info', 'Subiendo archivo XML...');

      // Convertir el string XML a un Readable stream
      const xmlStream = new Readable();
      xmlStream.push(xmlContent);
      xmlStream.push(null); // Indicar fin del stream

      await client.uploadFrom(xmlStream, fileName);
      await addLog('success', 'Archivo XML subido exitosamente', { fileName });

      // Verificar que el archivo se subió correctamente
      await addLog('info', 'Verificando archivo subido...');
      try {
        const finalList = await client.list();
        const uploadedFile = finalList.find(file => file.name === fileName);

        if (uploadedFile) {
          await addLog('success', 'Archivo verificado exitosamente', {
            fileName,
            fileSize: uploadedFile.size,
            uploadTime: new Date().toISOString()
          });
        } else {
          await addLog('error', 'El archivo no se encontró después de la subida');
          throw new Error('Verificación de archivo fallida');
        }
      } catch (verifyError: any) {
        await addLog('warning', 'No se pudo verificar el archivo subido', {
          error: verifyError.message
        });
      }

    } catch (ftpError: any) {
      await addLog('error', 'Error durante la operación FTP', {
        message: ftpError.message,
        code: ftpError.code,
        stack: ftpError.stack
      });

      // Manejar errores específicos de FTP
      if (ftpError.code === 530) {
        await addLog('error', 'Error de autenticación FTP - Credenciales incorrectas', {
          errorCode: ftpError.code,
          user: ftpConfig.user,
          host: ftpConfig.host
        });
        throw new Error(`Credenciales FTP incorrectas. Usuario: ${ftpConfig.user}, Error: ${ftpError.message}`);
      } else {
        throw ftpError;
      }
    } finally {
      // Cerrar conexión FTP
      try {
        client.close();
        await addLog('info', 'Conexión FTP cerrada');
      } catch (closeError) {
        await addLog('warning', 'Error al cerrar conexión FTP', closeError);
      }
    }

    await addLog('success', 'Proceso completado exitosamente');

    // Guardar log de éxito en MongoDB
    await saveLogToMongo('info', 'ftp-upload-success', `XML enviado exitosamente a SAP via FTP: ${fileName}`, {
      invoiceId,
      fileName,
      targetPath: ftpConfig.path,
      host: ftpConfig.host
    }, req);

    console.log('✅ XML enviado a SAP via FTP exitosamente');

    res.json({
      success: true,
      message: "XML enviado a SAP exitosamente via FTP",
      logs,
      fileInfo: {
        fileName,
        targetPath: ftpConfig.path,
        uploadTime: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Error en sendXmlToSap:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || "Error interno del servidor",
      logs: req.body?.logs || [],
      error: {
        name: error.name,
        message: error.message,
        code: error.code
      }
    });
  }
};