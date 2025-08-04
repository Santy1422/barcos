import { Request, Response } from "express";
import { Client } from "basic-ftp";
import { getFtpConfigWithDebug } from "../../config/ftpConfig";

interface FtpLog {
  timestamp: string;
  level: 'info' | 'error' | 'success';
  message: string;
  details?: any;
}

const testFtpConnection = async (req: Request, res: Response) => {
  const logs: FtpLog[] = [];
  
  const addLog = (level: FtpLog['level'], message: string, details?: any) => {
    logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    });
    console.log(`[FTP TEST ${level.toUpperCase()}] ${message}`, details || '');
  };

  try {
    addLog('info', 'Iniciando test de conexión FTP');

    // Obtener credenciales base desde configuración
    const baseFtpConfig = getFtpConfigWithDebug();

    // Configuraciones a probar
    const configs = [
      {
        name: "FTP Simple",
        config: {
          host: baseFtpConfig.host,
          user: baseFtpConfig.user,
          password: baseFtpConfig.password,
          secure: false
        }
      },
      {
        name: "FTPS Implícito",
        config: {
          host: baseFtpConfig.host,
          user: baseFtpConfig.user,
          password: baseFtpConfig.password,
          secure: true,
          secureOptions: {
            rejectUnauthorized: false
          }
        }
      },
      {
        name: "FTPS Implícito (Puerto 990)",
        config: {
          host: baseFtpConfig.host,
          user: baseFtpConfig.user,
          password: baseFtpConfig.password,
          secure: "implicit" as const,
          port: 990,
          secureOptions: {
            rejectUnauthorized: false
          }
        }
      },
      {
        name: "FTP con TLS",
        config: {
          host: baseFtpConfig.host,
          user: baseFtpConfig.user,
          password: baseFtpConfig.password,
          secure: true,
          port: 21,
          secureOptions: {
            rejectUnauthorized: false
          }
        }
      }
    ];

    let successfulConfig = null;

    for (const { name, config } of configs) {
      addLog('info', `Probando configuración: ${name}`);
      
      const client = new Client();
      client.ftp.verbose = true;
      
      try {
        await client.access(config);
        addLog('success', `✅ Conexión exitosa con ${name}`);
        
        // Probar listado de directorio raíz
        try {
          const list = await client.list();
          addLog('success', 'Listado de directorio raíz obtenido', { 
            files: list.map(f => ({ name: f.name, type: f.type }))
          });
        } catch (listError) {
          addLog('error', 'Error al listar directorio raíz', listError);
        }
        
        // Probar navegación al directorio objetivo
        try {
          await client.cd(baseFtpConfig.path);
          addLog('success', 'Navegación al directorio objetivo exitosa', { path: baseFtpConfig.path });
          
          const targetList = await client.list();
          addLog('success', 'Listado del directorio objetivo', { 
            path: baseFtpConfig.path,
            files: targetList.map(f => ({ name: f.name, type: f.type, size: f.size }))
          });
        } catch (cdError) {
          addLog('error', 'Error al navegar al directorio objetivo', { path: baseFtpConfig.path, error: cdError });
        }
        
        client.close();
        successfulConfig = { name, config };
        break;
        
      } catch (error: any) {
        addLog('error', `❌ Falló ${name}`, { 
          message: error.message, 
          code: error.code 
        });
        client.close();
      }
    }

    if (successfulConfig) {
      addLog('success', `Configuración recomendada: ${successfulConfig.name}`);
      
      res.status(200).json({
        success: true,
        message: "Test de conexión completado exitosamente",
        recommendedConfig: successfulConfig,
        logs
      });
    } else {
      addLog('error', 'Ninguna configuración funcionó');
      
      res.status(400).json({
        success: false,
        message: "No se pudo establecer conexión con ninguna configuración",
        logs
      });
    }

  } catch (error: any) {
    addLog('error', 'Error general en test de conexión', error);
    
    res.status(500).json({
      success: false,
      message: "Error interno durante el test",
      error: error.message,
      logs
    });
  }
};

export default testFtpConnection;