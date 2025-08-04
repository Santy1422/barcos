import { Request, Response } from "express";
import { Client } from "basic-ftp";
import { getFtpConfigWithDebug } from "../../config/ftpConfig";

const debugFtpAuth = async (req: Request, res: Response) => {
  const logs: any[] = [];
  
  const addLog = (level: string, message: string, details?: any) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    logs.push(logEntry);
    console.log(`[FTP DEBUG ${level.toUpperCase()}] ${message}`, details || '');
  };

  try {
    addLog('info', 'Iniciando debug de autenticación FTP');

    // Obtener credenciales desde configuración (variables de entorno)
    const ftpConfig = getFtpConfigWithDebug();
    const { host: testHost, user: testUser, password: testPassword } = ftpConfig;

    addLog('info', 'Credenciales a probar', {
      host: testHost,
      user: testUser,
      passwordLength: testPassword.length,
      passwordFirstChar: testPassword.charAt(0),
      passwordLastChar: testPassword.charAt(testPassword.length - 1),
      // Para verificar que no hay caracteres ocultos
      passwordBytes: Buffer.from(testPassword, 'utf8').length,
      passwordHex: Buffer.from(testPassword, 'utf8').toString('hex'),
      sourceConfig: 'environment_variables'
    });

    const client = new Client();
    client.ftp.verbose = true;

    // Configuración más básica posible
    const basicConfig = {
      host: testHost,
      user: testUser,
      password: testPassword,
      secure: false
    };

    addLog('info', 'Intentando conexión básica FTP (sin SSL)');
    
    try {
      await client.access(basicConfig);
      addLog('success', '✅ ÉXITO: Autenticación FTP básica exitosa');
      
      // Probar operaciones básicas
      try {
        const rootList = await client.list();
        addLog('success', 'Listado de directorio raíz exitoso', {
          fileCount: rootList.length,
          files: rootList.slice(0, 5).map(f => f.name)
        });
      } catch (listError) {
        addLog('warning', 'Autenticación exitosa pero error al listar', listError);
      }
      
      client.close();
      
      return res.status(200).json({
        success: true,
        message: "Autenticación FTP exitosa",
        authResult: "SUCCESS",
        logs
      });
      
    } catch (authError: any) {
      addLog('error', '❌ Error en autenticación básica', {
        message: authError.message,
        code: authError.code,
        stack: authError.stack?.split('\n')[0]
      });
      
      client.close();
      
      // Intentar con puerto específico
      addLog('info', 'Probando con puerto 21 explícito');
      const clientPort21 = new Client();
      clientPort21.ftp.verbose = true;
      
      try {
        const configPort21 = {
          ...basicConfig,
          port: 21
        };
        
        await clientPort21.access(configPort21);
        addLog('success', '✅ ÉXITO: Autenticación con puerto 21 explícito');
        clientPort21.close();
        
        return res.status(200).json({
          success: true,
          message: "Autenticación FTP exitosa con puerto 21",
          authResult: "SUCCESS_PORT_21",
          logs
        });
        
      } catch (port21Error: any) {
        addLog('error', '❌ Error con puerto 21 explícito', port21Error);
        clientPort21.close();
        
        // Intentar verificar si las credenciales exactas son correctas
        addLog('error', 'TODAS LAS CONFIGURACIONES FALLARON');
        addLog('error', 'Posibles problemas:', {
          options: [
            'Credenciales incorrectas',
            'Usuario no existe',
            'Contraseña incorrecta', 
            'Servidor FTP no accesible',
            'Restricciones de IP',
            'Configuración de firewall'
          ]
        });
        
        return res.status(400).json({
          success: false,
          message: "No se pudo autenticar con ninguna configuración",
          authResult: "FAILED_ALL",
          logs
        });
      }
    }

  } catch (error: any) {
    addLog('error', 'Error general en debug', error);
    
    res.status(500).json({
      success: false,
      message: "Error interno durante debug",
      error: error.message,
      logs
    });
  }
};

export default debugFtpAuth;