import { Client } from 'ssh2';
import { Request, Response } from 'express';
import { getSftpConfigWithDebug } from '../../config/sftpConfig';

export const testSftpConnection = async (req: Request, res: Response) => {
  try {
    console.log('\n🔧 === TEST DE CONEXIÓN SFTP ===');
    
    const sftpConfig = getSftpConfigWithDebug();
    const logs: string[] = [];
    
    const addLog = (message: string) => {
      logs.push(`${new Date().toISOString()} - ${message}`);
      console.log(message);
    };

    addLog('Iniciando test de conexión SFTP...');
    addLog(`Host: ${sftpConfig.host}:${sftpConfig.port}`);
    addLog(`Usuario: ${sftpConfig.username}`);
    addLog(`Directorio destino: ${sftpConfig.path}`);
    addLog(`Protocolo: SFTP (SSH) sobre puerto ${sftpConfig.port}`);

    return new Promise((resolve, reject) => {
      const conn = new Client();
      
      let connectionSuccessful = false;
      let sftpSessionCreated = false;
      let directoryAccessible = false;
      let canWriteToDirectory = false;
      let testFileCreated = false;

      // Agregar timeout general para la conexión
      const connectionTimeout = setTimeout(() => {
        addLog(`❌ Timeout de conexión después de ${sftpConfig.readyTimeout || 20000}ms`);
        conn.end();
        resolve(res.json({
          success: false,
          message: 'Timeout de conexión SFTP',
          logs,
          details: {
            connectionSuccessful: false,
            sftpSessionCreated: false,
            directoryAccessible: false,
            canWriteToDirectory: false,
            testFileCreated: false
          }
        }));
      }, sftpConfig.readyTimeout || 20000);

      conn.on('ready', () => {
        clearTimeout(connectionTimeout);
        addLog('✅ Conexión SSH establecida exitosamente');
        connectionSuccessful = true;
        
        conn.sftp((err, sftp) => {
          if (err) {
            addLog(`❌ Error al crear sesión SFTP: ${err.message}`);
            addLog(`❌ Detalles del error: ${JSON.stringify(err)}`);
            conn.end();
            resolve(res.json({
              success: false,
              message: 'Error al crear sesión SFTP',
              logs,
              details: {
                connectionSuccessful,
                sftpSessionCreated: false,
                directoryAccessible: false,
                canWriteToDirectory: false,
                testFileCreated: false
              },
              error: {
                name: err.name,
                message: err.message
              }
            }));
            return;
          }

          addLog('✅ Sesión SFTP creada exitosamente');

          // Verificar si el directorio de destino existe
          sftp.stat(sftpConfig.path, (statErr, stats) => {
            if (statErr) {
              addLog(`⚠️ Directorio de destino no existe: ${statErr.message}`);
              addLog('Intentando crear directorio...');
              
              sftp.mkdir(sftpConfig.path, (mkdirErr) => {
                if (mkdirErr) {
                  addLog(`❌ No se pudo crear el directorio: ${mkdirErr.message}`);
                  conn.end();
                  resolve(res.json({
                    success: false,
                    message: 'No se pudo acceder al directorio de destino',
                    logs,
                    details: {
                      connectionSuccessful,
                      sftpSessionCreated,
                      directoryAccessible: false,
                      canWriteToDirectory: false,
                      testFileCreated: false
                    }
                  }));
                  return;
                }
                
                addLog('✅ Directorio de destino creado exitosamente');
                directoryAccessible = true;
                testWriteAccess();
              });
            } else {
              addLog('✅ Directorio de destino verificado');
              directoryAccessible = true;
              testWriteAccess();
            }
          });

          function testWriteAccess() {
            const testFileName = `test_${Date.now()}.txt`;
            const testContent = 'Test file created by SFTP connection test';
            const testPath = `${sftpConfig.path}/${testFileName}`;
            
            addLog(`Probando escritura con archivo: ${testFileName}`);
            addLog(`Ruta completa: ${testPath}`);
            
            // Agregar timeout para evitar que se quede colgado
            const writeTimeout = setTimeout(() => {
              addLog(`❌ Timeout al escribir archivo de prueba después de 30 segundos`);
              conn.end();
              resolve(res.json({
                success: false,
                message: 'Timeout al escribir archivo de prueba',
                logs,
                details: {
                  connectionSuccessful,
                  sftpSessionCreated,
                  directoryAccessible,
                  canWriteToDirectory: false,
                  testFileCreated: false
                }
              }));
            }, 30000);
            
            const writeStream = sftp.createWriteStream(testPath);
            
            writeStream.on('open', () => {
              addLog('✅ Stream de escritura abierto');
            });
            
            writeStream.on('error', (writeErr) => {
              clearTimeout(writeTimeout);
              addLog(`❌ Error al escribir archivo de prueba: ${writeErr.message}`);
              addLog(`❌ Detalles del error de escritura: ${JSON.stringify(writeErr)}`);
              conn.end();
              resolve(res.json({
                success: false,
                message: 'No se pudo escribir en el directorio de destino',
                logs,
                details: {
                  connectionSuccessful,
                  sftpSessionCreated,
                  directoryAccessible,
                  canWriteToDirectory: false,
                  testFileCreated: false
                }
              }));
            });

            writeStream.on('finish', () => {
              clearTimeout(writeTimeout);
              addLog('✅ Archivo de prueba creado exitosamente');
              canWriteToDirectory = true;
              
              // Verificar que el archivo se creó
              sftp.stat(testPath, (statErr, fileStats) => {
                if (statErr) {
                  addLog(`⚠️ No se pudo verificar el archivo creado: ${statErr.message}`);
                } else {
                  addLog(`✅ Archivo verificado - Tamaño: ${fileStats.size} bytes`);
                  testFileCreated = true;
                }
                
                // Limpiar archivo de prueba
                sftp.unlink(testPath, (unlinkErr) => {
                  if (unlinkErr) {
                    addLog(`⚠️ No se pudo eliminar archivo de prueba: ${unlinkErr.message}`);
                  } else {
                    addLog('✅ Archivo de prueba eliminado');
                  }
                  
                  conn.end();
                  resolve(res.json({
                    success: true,
                    message: 'Conexión SFTP exitosa - Todos los tests pasaron',
                    logs,
                    details: {
                      connectionSuccessful,
                      sftpSessionCreated,
                      directoryAccessible,
                      canWriteToDirectory,
                      testFileCreated
                    }
                  }));
                });
              });
            });

            writeStream.on('close', () => {
              addLog('✅ Stream de escritura cerrado');
            });

            // Intentar escribir el contenido
            try {
              const writeResult = writeStream.write(testContent);
              addLog(`Resultado de write(): ${writeResult}`);
              writeStream.end();
              addLog('✅ writeStream.end() llamado');
            } catch (writeError) {
              clearTimeout(writeTimeout);
              addLog(`❌ Error al escribir contenido: ${writeError.message}`);
              conn.end();
              resolve(res.json({
                success: false,
                message: 'Error al escribir contenido del archivo',
                logs,
                details: {
                  connectionSuccessful,
                  sftpSessionCreated,
                  directoryAccessible,
                  canWriteToDirectory: false,
                  testFileCreated: false
                }
              }));
            }
          }
        });
      });

      conn.on('error', (err) => {
        clearTimeout(connectionTimeout);
        addLog(`❌ Error de conexión SSH: ${err.message}`);
        addLog(`❌ Detalles del error de conexión: ${JSON.stringify(err)}`);
        conn.end();
        resolve(res.json({
          success: false,
          message: 'Error de conexión SSH',
          logs,
          details: {
            connectionSuccessful: false,
            sftpSessionCreated: false,
            directoryAccessible: false,
            canWriteToDirectory: false,
            testFileCreated: false
          },
          error: {
            name: err.name,
            message: err.message
          }
        }));
      });

      conn.on('end', () => {
        addLog('Conexión SSH cerrada');
      });

      // Conectar al servidor SFTP
      addLog(`Conectando a ${sftpConfig.host}:${sftpConfig.port}...`);
      
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
    console.error('❌ Error en testSftpConnection:', error);
    
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