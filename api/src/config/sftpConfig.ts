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
  host: process.env.SAP_SFTP_HOST || process.env.SAP_FTP_HOST || "ftp.msc.com",
  username: process.env.SAP_SFTP_USER || process.env.SAP_FTP_USER || "SAP_PanamaTSG", 
  password: process.env.SAP_SFTP_PASSWORD || process.env.SAP_FTP_PASSWORD || "6whLgP4RKRhnTFEfYPt0",
  path: process.env.SAP_SFTP_PATH || process.env.SAP_FTP_PATH || "/Test/Upload/SAP/001",
  port: process.env.SAP_SFTP_PORT ? parseInt(process.env.SAP_SFTP_PORT) : 22,
  readyTimeout: process.env.SAP_SFTP_TIMEOUT ? parseInt(process.env.SAP_SFTP_TIMEOUT) : 20000,
  strictVendor: process.env.SAP_SFTP_STRICT_VENDOR === 'true'
};

// Validar que las variables críticas estén configuradas
export const validateSftpConfig = (): boolean => {
  // Priorizar variables SFTP específicas, luego fallback a FTP
  const requiredVars = [
    'SAP_SFTP_HOST', 'SAP_SFTP_USER', 'SAP_SFTP_PASSWORD', // SFTP específicas
    'SAP_FTP_HOST', 'SAP_FTP_USER', 'SAP_FTP_PASSWORD'     // Fallback FTP
  ];
  
  // Verificar si tenemos al menos un conjunto completo de credenciales
  const hasSftpSpecific = process.env.SAP_SFTP_HOST && process.env.SAP_SFTP_USER && process.env.SAP_SFTP_PASSWORD;
  const hasFtpFallback = process.env.SAP_FTP_HOST && process.env.SAP_FTP_USER && process.env.SAP_FTP_PASSWORD;
  
  if (!hasSftpSpecific && !hasFtpFallback) {
    console.warn('⚠️  Variables de entorno SFTP/FTP faltantes');
    console.warn('⚠️  Usando valores por defecto (no recomendado para producción)');
    return false;
  }
  
  if (hasSftpSpecific) {
    console.log('✅ Configuración SFTP específica cargada desde variables de entorno');
  } else {
    console.log('✅ Configuración SFTP usando fallback FTP desde variables de entorno');
  }
  
  return true;
};

// Función para obtener configuración con logs de debug
export const getSftpConfigWithDebug = () => {
  const isFromEnv = validateSftpConfig();

  // Determinar qué variables se están usando
  const usingSftpSpecific = process.env.SAP_SFTP_HOST && process.env.SAP_SFTP_USER && process.env.SAP_SFTP_PASSWORD;
  const usingFtpFallback = process.env.SAP_FTP_HOST && process.env.SAP_FTP_USER && process.env.SAP_FTP_PASSWORD;

  console.log('🔧 Configuración SFTP:', {
    host: sapSftpConfig.host,
    username: sapSftpConfig.username,
    passwordLength: sapSftpConfig.password.length,
    passwordFirstChar: sapSftpConfig.password.charAt(0),
    passwordLastChar: sapSftpConfig.password.charAt(sapSftpConfig.password.length - 1),
    passwordHex: Buffer.from(sapSftpConfig.password).toString('hex'),
    path: sapSftpConfig.path,
    port: sapSftpConfig.port,
    readyTimeout: sapSftpConfig.readyTimeout,
    strictVendor: sapSftpConfig.strictVendor,
    fromEnv: isFromEnv,
    configSource: usingSftpSpecific ? 'SFTP_SPECIFIC' : usingFtpFallback ? 'FTP_FALLBACK' : 'DEFAULT'
  });

  return sapSftpConfig;
};

// Función para obtener configuración FTP tradicional (puerto 21, no segura)
export const getFtpConfigWithDebug = () => {
  const isFromEnv = validateSftpConfig();

  // Determinar qué variables se están usando
  const usingSftpSpecific = process.env.SAP_SFTP_HOST && process.env.SAP_SFTP_USER && process.env.SAP_SFTP_PASSWORD;
  const usingFtpFallback = process.env.SAP_FTP_HOST && process.env.SAP_FTP_USER && process.env.SAP_FTP_PASSWORD;

  // Crear configuración FTP específica
  const ftpConfig = {
    host: process.env.SAP_FTP_HOST || process.env.SAP_SFTP_HOST || "ftp.msc.com",
    username: process.env.SAP_FTP_USER || process.env.SAP_SFTP_USER || "SAP_PanamaTSG",
    password: process.env.SAP_FTP_PASSWORD || process.env.SAP_SFTP_PASSWORD || "6whLgP4RKRhnTFEfYPt0",
    path: process.env.SAP_FTP_PATH || process.env.SAP_SFTP_PATH || "/Test/Upload/SAP/001",
    port: 21, // FTP tradicional usa puerto 21
  };

  console.log('🔧 Configuración FTP tradicional:', {
    host: ftpConfig.host,
    username: ftpConfig.username,
    passwordLength: ftpConfig.password.length,
    passwordFirstChar: ftpConfig.password.charAt(0),
    passwordLastChar: ftpConfig.password.charAt(ftpConfig.password.length - 1),
    passwordHex: Buffer.from(ftpConfig.password).toString('hex'),
    path: ftpConfig.path,
    port: ftpConfig.port,
    fromEnv: isFromEnv,
    configSource: usingSftpSpecific ? 'SFTP_SPECIFIC_FALLBACK' : usingFtpFallback ? 'FTP_SPECIFIC' : 'DEFAULT'
  });

  return ftpConfig;
};