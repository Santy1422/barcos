import { Request, Response } from 'express';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';
import { getSftpConfigWithDebug } from '../../config/sftpConfig';

export const testFtpConnection = async (req: Request, res: Response) => {
  try {
    console.log('\n🔧 === TEST DE CONEXIÓN FTP TRADICIONAL ===');
    
    const sftpConfig = getSftpConfigWithDebug();
    const logs: string[] = [];
    
    const addLog = (message: string) => {
      logs.push(`${new Date().toISOString()} - ${message}`);
      console.log(message);
    };

    addLog('Iniciando test de conexión FTP tradicional...');
    addLog(`Host: ${sftpConfig.host}:21 (puerto FTP estándar)`);
    addLog(`Usuario: ${sftpConfig.username}`);
    addLog(`Directorio destino: ${sftpConfig.path}`);
    addLog(`Protocolo: FTP tradicional sobre puerto 21`);

    const client = new ftp.Client();
    client.ftp.verbose = true; // Habilitar logs detallados
    
    let connectionSuccessful = false;
    let directoryAccessible = false;
    let canWriteToDirectory = false;
    let testFileCreated = false;

    try {
      // Conectar al servidor FTP
      addLog(`Conectando a ${sftpConfig.host}:21...`);
      await client.access({
        host: sftpConfig.host,
        port: 21, // Puerto FTP estándar
        user: sftpConfig.username,
        password: sftpConfig.password,
        secure: false // FTP no seguro
      });
      
      addLog('✅ Conexión FTP establecida exitosamente');
      connectionSuccessful = true;

      // Verificar si el directorio de destino existe
      try {
        await client.cd(sftpConfig.path);
        addLog('✅ Directorio de destino verificado');
        directoryAccessible = true;
      } catch (cdError: any) {
        addLog(`⚠️ Directorio de destino no existe: ${cdError.message}`);
        addLog('Intentando crear directorio...');
        
        try {
          await client.ensureDir(sftpConfig.path);
          addLog('✅ Directorio de destino creado exitosamente');
          directoryAccessible = true;
        } catch (mkdirError: any) {
          addLog(`❌ No se pudo crear el directorio: ${mkdirError.message}`);
          client.close();
          return res.json({
            success: false,
            message: 'No se pudo acceder al directorio de destino',
            logs,
            details: {
              connectionSuccessful,
              directoryAccessible: false,
              canWriteToDirectory: false,
              testFileCreated: false
            }
          });
        }
      }

      // Probar escritura de archivo
      const testFileName = `test_${Date.now()}.txt`;
      const testContent = 'Test file created by FTP connection test';
      const testPath = `${sftpConfig.path}/${testFileName}`;
      
      addLog(`Probando escritura con archivo: ${testFileName}`);
      addLog(`Ruta completa: ${testPath}`);

      try {
        // Crear un buffer con el contenido de prueba
        const buffer = Buffer.from(testContent, 'utf8');
        
        // Convertir buffer a stream legible
        const readableStream = Readable.from(buffer);
        
        // Subir el archivo
        await client.uploadFrom(readableStream, testFileName);
        addLog('✅ Archivo de prueba creado exitosamente');
        canWriteToDirectory = true;

        // Verificar que el archivo se creó
        try {
          const fileList = await client.list();
          const uploadedFile = fileList.find(file => file.name === testFileName);
          if (uploadedFile) {
            addLog(`✅ Archivo verificado - Tamaño: ${uploadedFile.size} bytes`);
            testFileCreated = true;
          } else {
            addLog('⚠️ No se pudo verificar el archivo creado');
          }
        } catch (statError: any) {
          addLog(`⚠️ No se pudo verificar el archivo creado: ${statError.message}`);
        }

        // Limpiar archivo de prueba
        try {
          await client.remove(testFileName);
          addLog('✅ Archivo de prueba eliminado');
        } catch (unlinkError: any) {
          addLog(`⚠️ No se pudo eliminar archivo de prueba: ${unlinkError.message}`);
        }

        client.close();
        
        return res.json({
          success: true,
          message: 'Conexión FTP exitosa - Todos los tests pasaron',
          logs,
          details: {
            connectionSuccessful,
            directoryAccessible,
            canWriteToDirectory,
            testFileCreated
          }
        });

      } catch (writeError: any) {
        addLog(`❌ Error al escribir archivo de prueba: ${writeError.message}`);
        client.close();
        return res.json({
          success: false,
          message: 'No se pudo escribir en el directorio de destino',
          logs,
          details: {
            connectionSuccessful,
            directoryAccessible,
            canWriteToDirectory: false,
            testFileCreated: false
          }
        });
      }

    } catch (connectionError: any) {
      addLog(`❌ Error de conexión FTP: ${connectionError.message}`);
      addLog(`❌ Detalles del error: ${JSON.stringify(connectionError)}`);
      client.close();
      
      return res.json({
        success: false,
        message: 'Error de conexión FTP',
        logs,
        details: {
          connectionSuccessful: false,
          directoryAccessible: false,
          canWriteToDirectory: false,
          testFileCreated: false
        },
        error: {
          name: connectionError.name,
          message: connectionError.message
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Error en testFtpConnection:', error);
    
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