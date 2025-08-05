import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

export interface SftpConfig {
  host: string;
  username: string;
  password: string;
  path: string;
  port?: number;
  readyTimeout?: number;
  strictVendor?: boolean;
}

// Configuración SFTP para SAP
export const sapSftpConfig: SftpConfig = {
  host: process.env.SAP_FTP_HOST || "ftp.msc.com",
  username: process.env.SAP_FTP_USER || "SAP_PanamaTSG", 
  password: process.env.SAP_FTP_PASSWORD || "6whLgP4RKRhnTFEfYPt0",
  path: process.env.SAP_FTP_PATH || "/Test/Upload/SAP/001",
  port: process.env.SAP_SFTP_PORT ? parseInt(process.env.SAP_SFTP_PORT) : 22,
  readyTimeout: 20000,
  strictVendor: false
};

// Validar que las variables críticas estén configuradas
export const validateSftpConfig = (): boolean => {
  const requiredVars = ['SAP_FTP_HOST', 'SAP_FTP_USER', 'SAP_FTP_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Variables de entorno SFTP faltantes:', missingVars);
    console.warn('⚠️  Usando valores por defecto (no recomendado para producción)');
    return false;
  }
  
  console.log('✅ Configuración SFTP cargada desde variables de entorno');
  return true;
};

// Función para obtener configuración con logs de debug
export const getSftpConfigWithDebug = () => {
  const isFromEnv = validateSftpConfig();
  
  console.log('🔧 Configuración SFTP:', {
    host: sapSftpConfig.host,
    username: sapSftpConfig.username,
    passwordLength: sapSftpConfig.password.length,
    passwordFirstChar: sapSftpConfig.password.charAt(0),
    passwordLastChar: sapSftpConfig.password.charAt(sapSftpConfig.password.length - 1),
    passwordHex: Buffer.from(sapSftpConfig.password).toString('hex'),
    path: sapSftpConfig.path,
    port: sapSftpConfig.port,
    fromEnv: isFromEnv
  });
  
  return sapSftpConfig;
};