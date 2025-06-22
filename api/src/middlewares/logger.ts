import fs from 'fs';
import path from 'path';

export const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const userAgent = req.get('User-Agent');
  const ip = req.ip;
  
  const logEntry = `${timestamp} - ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}\n`;
  
  // Crear directorio de logs si no existe
  const logsDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Escribir log
  const logFile = path.join(logsDir, `requests-${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, logEntry);
  
  next();
};