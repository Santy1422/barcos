import { Client as FtpClient } from 'basic-ftp';
import { Request, Response } from 'express';
import { Readable } from 'stream';
import { getFtpConfigWithDebug } from '../../config/ftpConfig';

export const testFtpConnection = async (req: Request, res: Response) => {
  try {
    console.log('\n🔧 === TEST DE CONEXIÓN FTP ===');
    
    const ftpConfig = getFtpConfigWithDebug();
    const logs: string[] = [];
    
    const addLog = (message: string) => {
      logs.push(`${new Date().toISOString()} - ${message}`);
      console.log(message);
    };

    addLog('Iniciando test de conexión FTP...');
    addLog(`Host: ${ftpConfig.host}:21`);
    addLog(`Usuario: ${ftpConfig.user}`);
    addLog(`Directorio destino: ${ftpConfig.path}`);

    const client = new FtpClient();
    client.ftp.verbose = true;
    
    let connectionSuccessful = false;
    let directoryAccessible = false;
    let canWriteToDirectory = false;

    try {
      // Test 1: Conexión básica
      addLog('\n=== TEST 1: CONEXIÓN BÁSICA ===');
      addLog('Intentando conectar al servidor FTP...');
      
      await client.access({
        host: ftpConfig.host,
        user: ftpConfig.user,
        password: ftpConfig.password,
        secure: false
      });
      
      connectionSuccessful = true;
      addLog('✅ Conexión FTP establecida exitosamente');

      // Test 2: Listar directorio raíz
      addLog('\n=== TEST 2: NAVEGACIÓN ===');
      addLog('Listando directorio raíz...');
      
      try {
        const rootList = await client.list('/');
        addLog(`✅ Directorio raíz listado exitosamente (${rootList.length} elementos)`);
        
        // Mostrar primeros elementos
        const sampleItems = rootList.slice(0, 5);
        sampleItems.forEach(item => {
          addLog(`   - ${item.name} (${item.type})`);
        });
        if (rootList.length > 5) {
          addLog(`   ... y ${rootList.length - 5} elementos más`);
        }
      } catch (listError: any) {
        addLog(`⚠️  Error al listar directorio raíz: ${listError.message}`);
      }

      // Test 3: Acceso al directorio de destino
      addLog('\n=== TEST 3: DIRECTORIO DE DESTINO ===');
      addLog(`Verificando acceso a: ${ftpConfig.path}`);
      
      try {
        await client.cd(ftpConfig.path);
        addLog('✅ Directorio de destino accesible');
        directoryAccessible = true;
        
        try {
          const targetList = await client.list();
          addLog(`✅ Directorio de destino listado exitosamente (${targetList.length} elementos)`);
          
          // Mostrar algunos archivos del directorio
          const files = targetList.filter(item => item.type === 1); // tipo 1 = archivo
          const dirs = targetList.filter(item => item.type === 2);  // tipo 2 = directorio
          
          addLog(`   - Archivos: ${files.length}`);
          addLog(`   - Directorios: ${dirs.length}`);
          
          if (files.length > 0) {
            addLog('   Archivos recientes:');
            files.slice(0, 3).forEach(file => {
              addLog(`     - ${file.name} (${file.size} bytes)`);
            });
          }
          
        } catch (targetListError: any) {
          addLog(`⚠️  Error al listar contenido del directorio: ${targetListError.message}`);
        }
        
      } catch (pathError: any) {
        addLog(`❌ Error al acceder al directorio de destino: ${pathError.message}`);
      }

      // Test 4: Permisos de escritura (solo si el directorio es accesible)
      if (directoryAccessible) {
        addLog('\n=== TEST 4: PERMISOS DE ESCRITURA ===');
        addLog('Probando permisos de escritura...');
        
        const testFileName = `test_write_${Date.now()}.txt`;
        const testContent = `Test de escritura FTP - ${new Date().toISOString()}`;
        
        try {
          // Intentar crear un archivo de prueba
          const testStream = new Readable();
          testStream.push(testContent);
          testStream.push(null); // Indicar fin del stream
          
          await client.uploadFrom(testStream, testFileName);
          addLog('✅ Archivo de prueba creado exitosamente');
          
          // Verificar que el archivo existe
          const fileList = await client.list();
          const testFile = fileList.find(file => file.name === testFileName);
          
          if (testFile) {
            addLog('✅ Archivo de prueba verificado');
            canWriteToDirectory = true;
            
            // Limpiar - eliminar archivo de prueba
            try {
              await client.remove(testFileName);
              addLog('✅ Archivo de prueba eliminado (limpieza exitosa)');
            } catch (deleteError: any) {
              addLog(`⚠️  No se pudo eliminar archivo de prueba: ${deleteError.message}`);
            }
          } else {
            addLog('❌ El archivo de prueba no se encontró después de crearlo');
          }
        } catch (writeError: any) {
          addLog(`❌ Error al probar escritura: ${writeError.message}`);
          addLog('   Verificar permisos de escritura en el directorio');
        }
      }

    } catch (error: any) {
      addLog(`❌ Error de conexión: ${error.message}`);
      if (error.code) addLog(`   Código de error: ${error.code}`);
    } finally {
      try {
        client.close();
        addLog('\n✅ Conexión FTP cerrada');
      } catch (closeError: any) {
        addLog(`⚠️  Error al cerrar conexión: ${closeError.message}`);
      }
    }

    // Resumen de resultados
    addLog('\n=== RESUMEN DE PRUEBAS ===');
    addLog(`Conexión: ${connectionSuccessful ? '✅ EXITOSA' : '❌ FALLIDA'}`);
    addLog(`Directorio destino: ${directoryAccessible ? '✅ ACCESIBLE' : '❌ NO ACCESIBLE'}`);
    addLog(`Permisos de escritura: ${canWriteToDirectory ? '✅ PERMITIDOS' : '❌ NO PERMITIDOS'}`);

    const overallSuccess = connectionSuccessful && directoryAccessible && canWriteToDirectory;
    
    if (overallSuccess) {
      addLog('\n🎉 ¡TODAS LAS PRUEBAS EXITOSAS! El sistema está listo para enviar archivos.');
    } else {
      addLog('\n⚠️  Algunas pruebas fallaron. Verificar configuración antes de usar en producción.');
    }

    res.json({
      success: overallSuccess,
      message: overallSuccess 
        ? 'Todas las pruebas FTP exitosas' 
        : 'Algunas pruebas FTP fallaron',
      logs,
      results: {
        connection: connectionSuccessful,
        directoryAccess: directoryAccessible,
        writePermissions: canWriteToDirectory
      },
      config: {
        host: ftpConfig.host,
        port: 21,
        user: ftpConfig.user,
        path: ftpConfig.path
      }
    });

  } catch (error: any) {
    console.error('❌ Error en testFtpConnection:', error);
    
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