import { Client } from 'ssh2';
import { Request, Response } from 'express';
import { Readable } from 'stream';
import { invoices } from '../../database';
import { getSftpConfigWithDebug } from '../../config/sftpConfig';
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
      module: 'sftp-sap',
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

export const sendXmlToSapSftp = async (req: Request, res: Response) => {
  try {
    console.log('\n🚀 === INICIANDO ENVÍO XML A SAP VIA SFTP ===');

    const { invoiceId } = req.params;
    const { xmlContent, fileName } = req.body;

    // Log inicio en MongoDB
    await saveLogToMongo('info', 'sftp-upload-start', `Iniciando envío SFTP para factura ${invoiceId}`, {
      invoiceId,
      fileName,
      xmlLength: xmlContent?.length
    }, req);

    // Validar parámetros
    if (!invoiceId || !xmlContent || !fileName) {
      await saveLogToMongo('error', 'sftp-validation-error', 'Faltan parámetros requeridos', {
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
      console.log(`[SFTP ${level.toUpperCase()}] ${message}`, data || '');

      // Guardar en MongoDB si es error o warning
      if (level === 'error' || level === 'warning') {
        await saveLogToMongo(level, `sftp-${level}`, message, { ...data, invoiceId }, req);
      }
    };

    addLog('info', 'Iniciando proceso de envío SFTP', { 
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

    // Configuración SFTP desde variables de entorno
    const sftpConfig = getSftpConfigWithDebug();

    addLog('info', 'Configurando conexión SFTP', { 
      host: sftpConfig.host, 
      username: sftpConfig.username,
      port: sftpConfig.port,
      passwordLength: sftpConfig.password?.length || 0,
      passwordPresent: !!sftpConfig.password,
      configPath: sftpConfig.path
    });

    return new Promise((resolve, reject) => {
      const conn = new Client();
      
      conn.on('ready', () => {
        addLog('success', 'Conexión SSH establecida exitosamente');
        
        conn.sftp((err, sftp) => {
          if (err) {
            addLog('error', 'Error al crear sesión SFTP', err);
            conn.end();
            reject(new Error(`Error SFTP: ${err.message}`));
            return;
          }

          addLog('info', 'Sesión SFTP creada exitosamente');

          // Verificar si el directorio de destino existe
          sftp.stat(sftpConfig.path, (statErr, stats) => {
            if (statErr) {
              addLog('warning', 'Directorio de destino no existe, intentando crear...', { 
                path: sftpConfig.path, 
                error: statErr.message 
              });
              
              // Intentar crear el directorio
              sftp.mkdir(sftpConfig.path, (mkdirErr) => {
                if (mkdirErr) {
                  addLog('error', 'No se pudo crear el directorio de destino', { 
                    path: sftpConfig.path, 
                    error: mkdirErr.message 
                  });
                  conn.end();
                  reject(new Error(`No se pudo acceder al directorio: ${sftpConfig.path}`));
                  return;
                }
                
                addLog('success', 'Directorio de destino creado exitosamente');
                uploadFile();
              });
            } else {
              addLog('success', 'Directorio de destino verificado', { 
                path: sftpConfig.path,
                isDirectory: stats.isDirectory()
              });
              uploadFile();
            }
          });

          function uploadFile() {
            // Crear el stream de lectura del XML
            const xmlStream = new Readable();
            xmlStream.push(xmlContent);
            xmlStream.push(null);

            const remotePath = `${sftpConfig.path}/${fileName}`;
            
            addLog('info', 'Preparando archivo XML para subida', { 
              fileName,
              remotePath,
              fileSize: Buffer.byteLength(xmlContent, 'utf8')
            });

            // Subir el archivo XML
            addLog('info', 'Subiendo archivo XML via SFTP...');
            
            const writeStream = sftp.createWriteStream(remotePath);
            
            writeStream.on('error', (writeErr) => {
              addLog('error', 'Error durante la subida del archivo', writeErr);
              conn.end();
              reject(new Error(`Error al subir archivo: ${writeErr.message}`));
            });

            writeStream.on('finish', () => {
              addLog('success', 'Archivo XML subido exitosamente via SFTP', { 
                fileName,
                remotePath
              });

              // Verificar que el archivo se subió correctamente
              sftp.stat(remotePath, (statErr, fileStats) => {
                if (statErr) {
                  addLog('warning', 'No se pudo verificar el archivo subido', { 
                    error: statErr.message 
                  });
                } else {
                  addLog('success', 'Archivo verificado exitosamente', {
                    fileName,
                    fileSize: fileStats.size,
                    uploadTime: new Date().toISOString()
                  });
                }

                // Actualizar la factura en la base de datos
                updateInvoiceInDatabase();
              });
            });

            xmlStream.pipe(writeStream);
          }

          function updateInvoiceInDatabase() {
            // Actualizar la factura para marcar que el XML fue enviado a SAP
            invoices.findByIdAndUpdate(
              invoiceId,
              {
                $set: {
                  'xmlData.sentToSap': true,
                  'xmlData.sentToSapAt': new Date(),
                  'xmlData.sentVia': 'sftp',
                  sentToSap: true,
                  sentToSapAt: new Date(),
                  sapFileName: fileName,
                  sapProtocol: 'SFTP'
                }
              },
              { new: true }
            ).then((updatedInvoice) => {
              addLog('success', 'Factura actualizada en base de datos', {
                invoiceId,
                sentToSap: updatedInvoice?.xmlData?.sentToSap,
                sentAt: updatedInvoice?.xmlData?.sentToSapAt
              });

              conn.end();
              
              addLog('success', 'Proceso completado exitosamente');
              console.log('✅ XML enviado a SAP via SFTP exitosamente');

              resolve(res.json({
                success: true,
                message: "XML enviado a SAP exitosamente via SFTP",
                logs,
                fileInfo: {
                  fileName,
                  targetPath: sftpConfig.path,
                  uploadTime: new Date().toISOString(),
                  protocol: 'sftp'
                }
              }));
            }).catch((dbError) => {
              addLog('error', 'Error al actualizar factura en base de datos', dbError);
              conn.end();
              reject(new Error(`Error de base de datos: ${dbError.message}`));
            });
          }
        });
      });

      conn.on('error', (err) => {
        addLog('error', 'Error de conexión SSH', err);
        reject(new Error(`Error de conexión SSH: ${err.message}`));
      });

      conn.on('end', () => {
        addLog('info', 'Conexión SSH cerrada');
      });

      // Conectar al servidor SFTP
      addLog('info', 'Conectando al servidor SFTP...', {
        host: sftpConfig.host,
        port: sftpConfig.port,
        username: sftpConfig.username
      });

      conn.connect({
        host: sftpConfig.host,
        port: sftpConfig.port,
        username: sftpConfig.username,
        password: sftpConfig.password,
        readyTimeout: sftpConfig.readyTimeout || 20000,
        strictVendor: sftpConfig.strictVendor || false
      });
    });

  } catch (error: any) {
    console.error('❌ Error en sendXmlToSapSftp:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || "Error interno del servidor",
      logs: req.body?.logs || [],
      error: {
        name: error.name,
        message: error.message
      }
    });
  }
}; 