import { Request, Response } from "express";
import { Client } from "basic-ftp";
import { Readable } from "stream";
import { invoices } from "../../database";
import { getFtpConfigWithDebug } from "../../config/ftpConfig";

interface FtpLog {
  timestamp: string;
  level: 'info' | 'error' | 'success';
  message: string;
  details?: any;
}

const sendXmlToSap = async (req: Request, res: Response) => {
  const logs: FtpLog[] = [];
  
  const addLog = (level: FtpLog['level'], message: string, details?: any) => {
    logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    });
    console.log(`[FTP ${level.toUpperCase()}] ${message}`, details || '');
  };

  try {
    const { invoiceId } = req.params;
    const { xmlContent, fileName } = req.body;

    addLog('info', 'Iniciando proceso de envío XML a SAP', { invoiceId, fileName });

    // Validar datos requeridos
    if (!invoiceId || !xmlContent || !fileName) {
      addLog('error', 'Datos requeridos faltantes', { invoiceId, fileName, hasXml: !!xmlContent });
      return res.status(400).json({
        success: false,
        message: "Datos requeridos faltantes",
        logs
      });
    }

    // Verificar que la factura existe
    addLog('info', 'Buscando factura en la base de datos...');
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
      secure: ftpConfig.secure,
      passwordLength: ftpConfig.password?.length || 0,
      passwordPresent: !!ftpConfig.password,
      configPath: ftpConfig.path
    });

    const client = new Client();
    
    // Configurar debug y timeouts
    client.ftp.verbose = true;
    
    // Configurar timeout manualmente
    const originalAccess = client.access.bind(client);
    client.access = function(config: any) {
      if (this.ftp.socket) {
        this.ftp.socket.setTimeout(30000);
      }
      return originalAccess(config);
    };

    try {
      // Conectar al servidor FTP
      addLog('info', 'Conectando al servidor FTP...');
      
      try {
        await client.access(ftpConfig);
        addLog('success', 'Conexión FTP establecida exitosamente');
      } catch (authError: any) {
        addLog('error', 'Error de autenticación, intentando configuración alternativa', authError);
        
        // Cerrar conexión anterior si existe
        client.close();
        
        // Cerrar cliente anterior
        const newClient = new Client();
        newClient.ftp.verbose = true;
        
        // Intentar con configuración alternativa (FTPS implícito)
        const altFtpConfig = {
          ...ftpConfig,
          secure: "implicit" as const,
          secureOptions: {
            rejectUnauthorized: false
          }
        };
        
        addLog('info', 'Reintentando con FTPS implícito...', {
          host: altFtpConfig.host,
          user: altFtpConfig.user,
          passwordLength: altFtpConfig.password?.length || 0,
          secure: altFtpConfig.secure
        });
        
        await newClient.access(altFtpConfig);
        addLog('success', 'Conexión FTP establecida con configuración alternativa');
        
        // Usar el nuevo cliente para el resto de las operaciones
        client.close();
        Object.assign(client, newClient);
      }

      // Cambiar al directorio de destino
      const targetPath = ftpConfig.path;
      addLog('info', 'Navegando al directorio de destino', { targetPath });
      
      try {
        await client.cd(targetPath);
        addLog('success', 'Directorio de destino alcanzado');
      } catch (cdError) {
        addLog('error', 'Error al cambiar directorio', { targetPath, error: cdError });
        throw new Error(`No se pudo acceder al directorio: ${targetPath}`);
      }

      // Listar contenido del directorio (para verificar)
      addLog('info', 'Verificando directorio de destino...');
      const dirList = await client.list();
      addLog('info', 'Contenido del directorio', { 
        files: dirList.map(f => ({ name: f.name, size: f.size, type: f.type })) 
      });

      // Crear buffer del contenido XML
      const xmlBuffer = Buffer.from(xmlContent, 'utf8');
      addLog('info', 'Preparando archivo XML para envío', { 
        fileName, 
        size: xmlBuffer.length,
        encoding: 'utf8'
      });

      // Crear stream desde el buffer
      const xmlStream = new Readable();
      xmlStream.push(xmlBuffer);
      xmlStream.push(null); // Fin del stream

      // Subir el archivo XML
      addLog('info', 'Iniciando subida del archivo XML...');
      await client.uploadFrom(xmlStream, fileName);
      addLog('success', 'Archivo XML subido exitosamente', { fileName });

      // Verificar que el archivo se subió correctamente
      addLog('info', 'Verificando archivo subido...');
      const updatedDirList = await client.list();
      const uploadedFile = updatedDirList.find(f => f.name === fileName);
      
      if (uploadedFile) {
        addLog('success', 'Archivo verificado en el servidor', { 
          fileName: uploadedFile.name,
          size: uploadedFile.size,
          uploadTime: new Date().toISOString()
        });
      } else {
        addLog('error', 'Archivo no encontrado después de la subida', { fileName });
      }

      // Cerrar conexión FTP
      client.close();
      addLog('success', 'Conexión FTP cerrada correctamente');

      // Actualizar la factura con información del envío
      const sapSendData = {
        sentToSap: true,
        sapSentAt: new Date(),
        sapFileName: fileName,
        // @ts-ignore
        sapSentBy: req.user?.id
      };

      await invoices.findByIdAndUpdate(invoiceId, {
        $set: sapSendData
      });

      addLog('success', 'Registro de envío actualizado en la base de datos');

      res.status(200).json({
        success: true,
        message: "XML enviado exitosamente a SAP",
        data: {
          fileName,
          uploadTime: new Date().toISOString(),
          fileSize: xmlBuffer.length,
          targetPath
        },
        logs
      });

    } catch (ftpError: any) {
      addLog('error', 'Error durante la operación FTP', ftpError);
      client.close();
      
      res.status(500).json({
        success: false,
        message: "Error al conectar o enviar archivo a SAP",
        error: ftpError.message,
        logs
      });
    }

  } catch (error: any) {
    addLog('error', 'Error general en el proceso', error);
    console.error("Error al enviar XML a SAP:", error);
    
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
      logs
    });
  }
};

export default sendXmlToSap;