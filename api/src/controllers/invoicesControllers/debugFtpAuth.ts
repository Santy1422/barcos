import { Client as FtpClient } from 'basic-ftp';
import { Request, Response } from 'express';
import { getFtpConfigWithDebug } from '../../config/ftpConfig';

export const debugFtpAuth = async (req: Request, res: Response) => {
  try {
    console.log('\n🔍 === DEBUG AUTENTICACIÓN FTP ===');
    
    const ftpConfig = getFtpConfigWithDebug();
    const logs: string[] = [];
    
    const addLog = (message: string) => {
      logs.push(`${new Date().toISOString()} - ${message}`);
      console.log(message);
    };

    // Información detallada de credenciales
    addLog('=== INFORMACIÓN DE CREDENCIALES FTP ===');
    addLog(`Host: ${ftpConfig.host}`);
    addLog(`Puerto: 21`);
    addLog(`Usuario: ${ftpConfig.user}`);
    addLog(`Contraseña longitud: ${ftpConfig.password.length}`);
    addLog(`Contraseña primer carácter: "${ftpConfig.password.charAt(0)}"`);
    addLog(`Contraseña último carácter: "${ftpConfig.password.charAt(ftpConfig.password.length - 1)}"`);
    addLog(`Contraseña (hex): ${Buffer.from(ftpConfig.password).toString('hex')}`);
    addLog(`Path destino: ${ftpConfig.path}`);

    // Detectar caracteres invisibles
    const hasCarriageReturn = ftpConfig.password.includes('\r');
    const hasNewline = ftpConfig.password.includes('\n');
    const hasTabs = ftpConfig.password.includes('\t');
    
    if (hasCarriageReturn || hasNewline || hasTabs) {
      addLog('⚠️  ADVERTENCIA: Se detectaron caracteres especiales en la contraseña:');
      if (hasCarriageReturn) addLog('   - Carriage Return (\\r) detectado');
      if (hasNewline) addLog('   - Newline (\\n) detectado');
      if (hasTabs) addLog('   - Tab (\\t) detectado');
    } else {
      addLog('✅ No se detectaron caracteres especiales en la contraseña');
    }

    // Probar diferentes configuraciones FTP
    const testConfigs = [
      {
        name: 'FTP Estándar',
        config: {
          host: ftpConfig.host,
          user: ftpConfig.user,
          password: ftpConfig.password,
          secure: false
        }
      },
      {
        name: 'FTP con timeout extendido',
        config: {
          host: ftpConfig.host,
          user: ftpConfig.user,
          password: ftpConfig.password,
          secure: false,
          timeout: 30000
        }
      },
      {
        name: 'FTP modo pasivo',
        config: {
          host: ftpConfig.host,
          user: ftpConfig.user,
          password: ftpConfig.password,
          secure: false,
          pasv: true
        }
      }
    ];

    let successfulConfig = null;

    for (const testConfig of testConfigs) {
      addLog(`\n=== PROBANDO: ${testConfig.name} ===`);
      
      const client = new FtpClient();
      client.ftp.verbose = true;
      
      try {
        addLog(`Intentando conectar con ${testConfig.name}...`);
        await client.access(testConfig.config);
        addLog(`✅ Conexión exitosa con ${testConfig.name}`);
        
        // Probar listar directorio raíz
        try {
          const rootList = await client.list('/');
          addLog(`✅ Listado de directorio raíz exitoso (${rootList.length} elementos)`);
        } catch (listError: any) {
          addLog(`⚠️  Error al listar directorio raíz: ${listError.message}`);
        }
        
        // Probar acceso al directorio de destino
        try {
          await client.cd(ftpConfig.path);
          addLog(`✅ Directorio de destino accesible: ${ftpConfig.path}`);
          
          try {
            const targetList = await client.list();
            addLog(`✅ Listado de directorio de destino exitoso (${targetList.length} elementos)`);
          } catch (targetListError: any) {
            addLog(`⚠️  Error al listar directorio de destino: ${targetListError.message}`);
          }
        } catch (pathError: any) {
          addLog(`❌ Error al verificar directorio de destino: ${pathError.message}`);
        }
        
        successfulConfig = testConfig.name;
        client.close();
        break;
        
      } catch (error: any) {
        addLog(`❌ Error con ${testConfig.name}: ${error.message}`);
        if (error.code) addLog(`   Código de error: ${error.code}`);
        
        // Análisis específico del error
        if (error.code === 530) {
          addLog(`   DIAGNÓSTICO: Error de autenticación - Credenciales incorrectas`);
        } else if (error.code === 421) {
          addLog(`   DIAGNÓSTICO: Servidor demasiado ocupado o límite de conexiones`);
        } else if (error.code === 425 || error.code === 426) {
          addLog(`   DIAGNÓSTICO: Error de conexión de datos - Problemas de firewall/NAT`);
        }
      } finally {
        try {
          client.close();
        } catch (closeError) {
          // Ignorar errores de cierre
        }
      }
    }

    addLog('\n=== RESUMEN DE DEBUG ===');
    if (successfulConfig) {
      addLog(`✅ Autenticación exitosa con: ${successfulConfig}`);
      addLog('✅ Las credenciales FTP están correctas');
    } else {
      addLog('❌ Todas las configuraciones FTP fallaron');
      addLog('❌ Verificar credenciales con el proveedor');
      
      // Sugerencias específicas
      addLog('\n=== SUGERENCIAS DE SOLUCIÓN ===');
      addLog('1. Verificar que el usuario existe en el servidor FTP');
      addLog('2. Confirmar que la contraseña no ha cambiado');
      addLog('3. Verificar que la cuenta no está bloqueada');
      addLog('4. Contactar al administrador del servidor FTP');
    }

    res.json({
      success: !!successfulConfig,
      message: successfulConfig 
        ? `Autenticación FTP exitosa con ${successfulConfig}` 
        : 'Todas las configuraciones FTP fallaron',
      logs,
      credentials: {
        host: ftpConfig.host,
        port: 21,
        user: ftpConfig.user,
        passwordLength: ftpConfig.password.length,
        path: ftpConfig.path
      },
      successfulConfig,
      authResult: successfulConfig ? 'SUCCESS' : 'FAILED'
    });

  } catch (error: any) {
    console.error('❌ Error en debugFtpAuth:', error);
    
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