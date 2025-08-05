import SftpClient from 'ssh2-sftp-client';
import { Client as FtpClient } from 'basic-ftp';
import { Request, Response } from 'express';
import { getSftpConfigWithDebug } from '../../config/sftpConfig';
import { getFtpConfigWithDebug } from '../../config/ftpConfig';

interface LogEntry {
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
  timestamp: string;
}

export const diagnoseFtpServer = async (req: Request, res: Response) => {
  try {
    console.log('\n🔍 === DIAGNÓSTICO COMPLETO FTP/SFTP ===');
    
    const logs: LogEntry[] = [];
    
    const addLog = (level: LogEntry['level'], message: string, data?: any) => {
      const logEntry: LogEntry = {
        level,
        message,
        data,
        timestamp: new Date().toISOString()
      };
      logs.push(logEntry);
      console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    };

    addLog('info', '=== INICIANDO DIAGNÓSTICO DEL SERVIDOR ===');
    addLog('info', 'Probando AMBOS protocolos: FTP y SFTP');

    // Configuraciones
    const sftpConfig = getSftpConfigWithDebug();
    const ftpConfig = getFtpConfigWithDebug();

    const results = {
      ftp: { 
        success: false, 
        error: '', 
        details: {} as { 
          rootListing?: number, 
          targetListing?: number, 
          canAccessTarget?: boolean, 
          targetError?: string, 
          listError?: string 
        } 
      },
      sftp: { 
        success: false, 
        error: '', 
        details: {} as { 
          rootListing?: number, 
          targetListing?: number, 
          canAccessTarget?: boolean, 
          targetError?: string, 
          listError?: string 
        } 
      }
    };

    // =========================
    // TEST 1: FTP TRADICIONAL (Puerto 21)
    // =========================
    addLog('info', '🔧 === TEST 1: FTP TRADICIONAL (Puerto 21) ===');
    
    const ftpClient = new FtpClient();
    ftpClient.ftp.verbose = true;
    
    try {
      addLog('info', `Intentando FTP a ${ftpConfig.host}:21...`);
      
      await ftpClient.access({
        host: ftpConfig.host,
        user: ftpConfig.user,
        password: ftpConfig.password,
        secure: false
      });
      
      addLog('success', 'CONEXIÓN FTP EXITOSA!');
      results.ftp.success = true;
      
      // Probar navegación
      try {
        const list = await ftpClient.list('/');
        addLog('success', `FTP - Listado raíz exitoso (${list.length} elementos)`);
        results.ftp.details = { rootListing: list.length };
        
        // Probar directorio destino
        try {
          await ftpClient.cd(ftpConfig.path);
          addLog('success', `FTP - Directorio destino accesible: ${ftpConfig.path}`);
          
          const targetList = await ftpClient.list();
          addLog('success', `FTP - Listado destino exitoso (${targetList.length} elementos)`);
          results.ftp.details = { 
            ...results.ftp.details, 
            targetListing: targetList.length,
            canAccessTarget: true
          };
          
        } catch (cdError: any) {
          addLog('warning', `FTP - Error accediendo directorio destino: ${cdError.message}`);
          results.ftp.details = { 
            ...results.ftp.details, 
            canAccessTarget: false,
            targetError: cdError.message
          };
        }
        
      } catch (listError: any) {
        addLog('warning', `FTP - Error listando directorio: ${listError.message}`);
        results.ftp.details = { listError: listError.message };
      }
      
    } catch (ftpError: any) {
      addLog('error', `FTP - Error de conexión: ${ftpError.message}`);
      if (ftpError.code) addLog('error', `Código FTP: ${ftpError.code}`);
      results.ftp.error = ftpError.message;
    } finally {
      try {
        ftpClient.close();
        addLog('info', 'FTP - Conexión cerrada');
      } catch {}
    }

    // =========================
    // TEST 2: SFTP (Puerto 22)
    // =========================
    addLog('info', '🔧 === TEST 2: SFTP (Puerto 22) ===');
    
    const sftpClient = new SftpClient();
    
    try {
      addLog('info', `Intentando SFTP a ${sftpConfig.host}:${sftpConfig.port}...`);
      
      await sftpClient.connect(sftpConfig);
      
      addLog('success', 'CONEXIÓN SFTP EXITOSA!');
      results.sftp.success = true;
      
      // Probar navegación
      try {
        const list = await sftpClient.list('/');
        addLog('success', `SFTP - Listado raíz exitoso (${list.length} elementos)`);
        results.sftp.details = { rootListing: list.length };
        
        // Probar directorio destino
        try {
          const targetExists = await sftpClient.exists(sftpConfig.path);
          if (targetExists) {
            addLog('success', `SFTP - Directorio destino accesible: ${sftpConfig.path}`);
            
            const targetList = await sftpClient.list(sftpConfig.path);
            addLog('success', `SFTP - Listado destino exitoso (${targetList.length} elementos)`);
            results.sftp.details = { 
              ...results.sftp.details, 
              targetListing: targetList.length,
              canAccessTarget: true
            };
            
          } else {
            addLog('error', `SFTP - Directorio destino no existe: ${sftpConfig.path}`);
            results.sftp.details = { 
              ...results.sftp.details, 
              canAccessTarget: false,
              targetError: 'Directory not found'
            };
          }
        } catch (targetError: any) {
          addLog('warning', `SFTP - Error accediendo directorio destino: ${targetError.message}`);
          results.sftp.details = { 
            ...results.sftp.details, 
            canAccessTarget: false,
            targetError: targetError.message
          };
        }
        
      } catch (listError: any) {
        addLog('warning', `SFTP - Error listando directorio: ${listError.message}`);
        results.sftp.details = { listError: listError.message };
      }
      
    } catch (sftpError: any) {
      addLog('error', `SFTP - Error de conexión: ${sftpError.message}`);
      if (sftpError.code) addLog('error', `Código SFTP: ${sftpError.code}`);
      results.sftp.error = sftpError.message;
    } finally {
      try {
        await sftpClient.end();
        addLog('info', 'SFTP - Conexión cerrada');
      } catch {}
    }

    // =========================
    // ANÁLISIS DE RESULTADOS
    // =========================
    addLog('info', '🎯 === ANÁLISIS DE RESULTADOS ===');
    
    if (results.ftp.success && results.sftp.success) {
      addLog('success', '🎉 ¡AMBOS PROTOCOLOS FUNCIONAN!');
      addLog('info', 'Recomendación: Usar FTP (más simple y común)');
    } else if (results.ftp.success) {
      addLog('success', '✅ SOLO FTP FUNCIONA');
      addLog('info', 'El servidor requiere FTP tradicional (puerto 21)');
    } else if (results.sftp.success) {
      addLog('success', '✅ SOLO SFTP FUNCIONA');
      addLog('info', 'El servidor requiere SFTP (puerto 22)');
    } else {
      addLog('error', '❌ NINGÚN PROTOCOLO FUNCIONA');
      addLog('error', 'Verificar credenciales con el proveedor');
    }

    // Determinar el protocolo recomendado
    let recommendedProtocol = 'none';
    if (results.ftp.success && results.ftp.details.canAccessTarget) {
      recommendedProtocol = 'ftp';
    } else if (results.sftp.success && results.sftp.details.canAccessTarget) {
      recommendedProtocol = 'sftp';
    } else if (results.ftp.success) {
      recommendedProtocol = 'ftp';
    } else if (results.sftp.success) {
      recommendedProtocol = 'sftp';
    }

    addLog('success', `🚀 PROTOCOLO RECOMENDADO: ${recommendedProtocol.toUpperCase()}`);

    res.json({
      success: results.ftp.success || results.sftp.success,
      message: `Diagnóstico completo - Protocolo recomendado: ${recommendedProtocol.toUpperCase()}`,
      logs,
      results,
      recommendation: {
        protocol: recommendedProtocol,
        reasoning: recommendedProtocol === 'ftp' 
          ? 'FTP funciona y es más simple'
          : recommendedProtocol === 'sftp' 
          ? 'Solo SFTP funciona'
          : 'Ningún protocolo funciona con las credenciales actuales'
      },
      nextSteps: recommendedProtocol === 'ftp' 
        ? 'Implementar envío usando FTP tradicional'
        : recommendedProtocol === 'sftp' 
        ? 'Continuar usando SFTP'
        : 'Contactar proveedor para verificar credenciales y protocolo'
    });

  } catch (error: any) {
    console.error('❌ Error en diagnoseFtpServer:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || "Error interno del servidor",
      error: {
        name: error.name,
        message: error.message
      }
    });
  }
};