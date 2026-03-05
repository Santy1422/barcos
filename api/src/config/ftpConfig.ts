import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

interface FtpConfig {
  host: string;
  user: string;
  password: string;
  path: string;
  secure?: boolean | "implicit";
  port?: number;
  secureOptions?: {
    rejectUnauthorized: boolean;
  };
}

// Configuración FTP para SAP - Producción
export const sapFtpConfig: FtpConfig = {
  host: process.env.SAP_FTP_HOST || "ftp.msc.com",
  user: process.env.SAP_FTP_USER || "SAP-PanamaTSG",
  password: process.env.SAP_FTP_PASSWORD || "6whLgP4RKRhnTFEfYPt0",
  path: process.env.SAP_FTP_PATH || "/Upload/Prod/SAP/P01",
  secure: false, // Se puede cambiar desde .env si necesario
  secureOptions: {
    rejectUnauthorized: false
  }
};

// Validar que las variables críticas estén configuradas
export const validateFtpConfig = (): boolean => {
  const requiredVars = ['SAP_FTP_HOST', 'SAP_FTP_USER', 'SAP_FTP_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Variables de entorno FTP faltantes:', missingVars);
    console.warn('⚠️  Usando valores por defecto (no recomendado para producción)');
    return false;
  }
  
  console.log('✅ Configuración FTP cargada desde variables de entorno');
  return true;
};

// Función para obtener configuración con logs de debug
export const getFtpConfigWithDebug = () => {
  const isFromEnv = validateFtpConfig();
  
  console.log('🔧 Configuración FTP:', {
    host: sapFtpConfig.host,
    user: sapFtpConfig.user,
    passwordLength: sapFtpConfig.password.length,
    path: sapFtpConfig.path,
    fromEnv: isFromEnv
  });
  
  return sapFtpConfig;
};