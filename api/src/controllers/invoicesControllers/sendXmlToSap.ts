import { Client as FtpClient } from 'basic-ftp';
import { Request, Response } from 'express';
import { Readable } from 'stream';
import { invoices } from '../../database';
import { getFtpConfigWithDebug } from '../../config/ftpConfig';

interface LogEntry {
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
  timestamp: string;
}

export const sendXmlToSap = async (req: Request, res: Response) => {
  try {
    console.log('\n🚀 === INICIANDO ENVÍO XML A SAP VIA FTP ===');
    
    const { invoiceId } = req.params;
    const { xmlContent, fileName } = req.body;

    // Validar parámetros
    if (!invoiceId || !xmlContent || !fileName) {
      return res.status(400).json({
        success: false,
        message: "Faltan parámetros requeridos (invoiceId, xmlContent, fileName)"
      });
    }

    const logs: LogEntry[] = [];
    
    const addLog = (level: LogEntry['level'], message: string, data?: any) => {
      const logEntry: LogEntry = {
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

    // Buscar la factura
    const invoice = await invoices.findById(invoiceId);
    if (!invoice) {
      addLog('error', 'Factura no encontrada', { invoiceId });
      return res.status(404).json({
        success: false,
        message: "Factura no encontrada",
        logs
      });
    }

    addLog('info', 'Factura encontrada', { 
      invoiceNumber: invoice.invoiceNumber, 
      status: invoice.status 
    });

    // Configuración FTP desde variables de entorno
    const ftpConfig = getFtpConfigWithDebug();

    addLog('info', 'Configurando conexión FTP', { 
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
      addLog('info', 'Conectando al servidor FTP...', {
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
      
      addLog('success', 'Conexión FTP establecida exitosamente');

      // Cambiar al directorio de destino
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

      // Crear el buffer del archivo XML
      addLog('info', 'Preparando archivo XML para subida', { 
        fileName,
        fileSize: Buffer.byteLength(xmlContent, 'utf8')
      });

      // Subir el archivo XML
      addLog('info', 'Subiendo archivo XML...');
      
      // Convertir el string XML a un Readable stream
      const xmlStream = new Readable();
      xmlStream.push(xmlContent);
      xmlStream.push(null); // Indicar fin del stream
      
      await client.uploadFrom(xmlStream, fileName);
      addLog('success', 'Archivo XML subido exitosamente', { fileName });

      // Verificar que el archivo se subió correctamente
      addLog('info', 'Verificando archivo subido...');
      try {
        const finalList = await client.list();
        const uploadedFile = finalList.find(file => file.name === fileName);
        
        if (uploadedFile) {
          addLog('success', 'Archivo verificado exitosamente', {
            fileName,
            fileSize: uploadedFile.size,
            uploadTime: new Date().toISOString()
          });
        } else {
          addLog('error', 'El archivo no se encontró después de la subida');
          throw new Error('Verificación de archivo fallida');
        }
      } catch (verifyError: any) {
        addLog('warning', 'No se pudo verificar el archivo subido', { 
          error: verifyError.message 
        });
      }

    } catch (ftpError: any) {
      addLog('error', 'Error durante la operación FTP', ftpError);
      
      // Manejar errores específicos de FTP
      if (ftpError.code === 530) {
        addLog('error', 'Error de autenticación FTP - Credenciales incorrectas', {
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
        addLog('info', 'Conexión FTP cerrada');
      } catch (closeError) {
        addLog('warning', 'Error al cerrar conexión FTP', closeError);
      }
    }

    addLog('success', 'Proceso completado exitosamente');
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