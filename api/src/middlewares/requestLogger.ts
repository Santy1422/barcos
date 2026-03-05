import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// Directorio para logs en archivos (no en MongoDB)
const LOGS_DIR = path.join(__dirname, '../../logs');

// Crear directorio de logs si no existe
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Función para obtener el nombre del archivo de log del día
const getLogFileName = (type: 'requests' | 'errors'): string => {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(LOGS_DIR, `${type}-${date}.log`);
};

// Función para escribir log a archivo (async, no bloquea)
const writeToFile = (type: 'requests' | 'errors', data: any): void => {
  const fileName = getLogFileName(type);
  const logLine = JSON.stringify(data) + '\n';

  fs.appendFile(fileName, logLine, (err) => {
    if (err) {
      console.error('Error escribiendo log a archivo:', err.message);
    }
  });

  // Limpiar logs viejos (más de 7 días)
  cleanOldLogs();
};

// Limpiar logs viejos (ejecutar ocasionalmente)
let lastCleanup = 0;
const cleanOldLogs = (): void => {
  const now = Date.now();
  // Solo ejecutar cada hora
  if (now - lastCleanup < 3600000) return;
  lastCleanup = now;

  try {
    const files = fs.readdirSync(LOGS_DIR);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    files.forEach(file => {
      const match = file.match(/(\d{4}-\d{2}-\d{2})\.log$/);
      if (match) {
        const fileDate = new Date(match[1]);
        if (fileDate < sevenDaysAgo) {
          fs.unlinkSync(path.join(LOGS_DIR, file));
          console.log(`🧹 Log viejo eliminado: ${file}`);
        }
      }
    });
  } catch (err) {
    // Silenciar errores de limpieza
  }
};

// Función para extraer el módulo de la URL
const extractModule = (path: string): string | undefined => {
  const modulePatterns = [
    { pattern: /\/trucking/i, module: 'trucking' },
    { pattern: /\/agency/i, module: 'agency' },
    { pattern: /\/ptyss/i, module: 'ptyss' },
    { pattern: /\/shipchandler/i, module: 'shipchandler' },
    { pattern: /\/autoridades/i, module: 'autoridades' },
    { pattern: /\/invoices/i, module: 'invoices' },
    { pattern: /\/records/i, module: 'records' },
    { pattern: /\/clients/i, module: 'clients' },
    { pattern: /\/users/i, module: 'users' },
    { pattern: /\/user/i, module: 'auth' },
    { pattern: /\/excel/i, module: 'excel' },
    { pattern: /\/ftp|\/sftp|\/sap/i, module: 'sap-ftp' },
    { pattern: /\/routes/i, module: 'routes' },
    { pattern: /\/container/i, module: 'containers' },
    { pattern: /\/services/i, module: 'services' },
    { pattern: /\/logs/i, module: 'logs' },
  ];

  for (const { pattern, module } of modulePatterns) {
    if (pattern.test(path)) {
      return module;
    }
  }
  return 'other';
};

// Función para extraer la acción de la URL y método
const extractAction = (method: string, path: string): string => {
  const pathLower = path.toLowerCase();

  // Acciones de autenticación
  if (pathLower.includes('/login')) return 'login';
  if (pathLower.includes('/logout')) return 'logout';
  if (pathLower.includes('/register')) return 'register';

  // Acciones CRUD
  if (pathLower.includes('/bulk')) return method === 'POST' ? 'bulk-create' : 'bulk-update';
  if (pathLower.includes('/upload')) return 'upload';
  if (pathLower.includes('/export')) return 'export';
  if (pathLower.includes('/download')) return 'download';

  // Por método HTTP
  switch (method) {
    case 'GET': return pathLower.includes('/') && /[a-f0-9]{24}/.test(pathLower) ? 'get-one' : 'get-list';
    case 'POST': return 'create';
    case 'PUT': return 'update';
    case 'PATCH': return 'partial-update';
    case 'DELETE': return 'delete';
    default: return 'unknown';
  }
};

// Función para extraer ID de entidad de la URL
const extractEntityId = (path: string): string | undefined => {
  const objectIdMatch = path.match(/([a-f0-9]{24})/i);
  return objectIdMatch ? objectIdMatch[1] : undefined;
};

// Función para extraer tipo de entidad
const extractEntityType = (path: string): string | undefined => {
  const entityPatterns = [
    { pattern: /\/invoices?/i, type: 'invoice' },
    { pattern: /\/records?/i, type: 'record' },
    { pattern: /\/clients?/i, type: 'client' },
    { pattern: /\/users?/i, type: 'user' },
    { pattern: /\/routes?/i, type: 'route' },
    { pattern: /\/services?/i, type: 'service' },
    { pattern: /\/excels?/i, type: 'excel' },
    { pattern: /\/container/i, type: 'container' },
  ];

  for (const { pattern, type } of entityPatterns) {
    if (pattern.test(path)) {
      return type;
    }
  }
  return undefined;
};

// Función para sanitizar datos sensibles
const sanitizeData = (data: any, maxSize: number = 10000): any => {
  if (!data) return undefined;
  if (typeof data !== 'object') return data;

  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  const sensitiveFields = [
    'password', 'token', 'accessToken', 'refreshToken', 'secret',
    'apiKey', 'xmlContent', 'pdfData', 'authorization', 'cookie'
  ];

  const sanitizeObj = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;

    for (const key of Object.keys(obj)) {
      if (sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = sanitizeObj(obj[key]);
      }
    }
    return obj;
  };

  const result = sanitizeObj(sanitized);

  // Limitar tamaño
  const resultStr = JSON.stringify(result);
  if (resultStr.length > maxSize) {
    return {
      _truncated: true,
      _originalSize: resultStr.length,
      _preview: resultStr.substring(0, 1000) + '...'
    };
  }

  return result;
};

// Función para extraer headers relevantes (sin sensibles)
const extractHeaders = (headers: any): any => {
  if (!headers) return undefined;

  const safeHeaders: any = {};
  const relevantHeaders = [
    'content-type', 'content-length', 'accept', 'accept-language',
    'origin', 'referer', 'x-forwarded-for', 'x-real-ip',
    'x-request-id', 'x-correlation-id'
  ];

  for (const header of relevantHeaders) {
    if (headers[header]) {
      safeHeaders[header] = headers[header];
    }
  }

  return Object.keys(safeHeaders).length > 0 ? safeHeaders : undefined;
};

// Middleware principal de logging
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Agregar requestId al request para trazabilidad
  (req as any).requestId = requestId;

  // Capturar el body original de la respuesta
  const originalSend = res.send;
  const originalJson = res.json;
  let responseBody: any;

  res.send = function(body: any) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  res.json = function(body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Cuando la respuesta termine, guardar el log
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime;
    const user = (req as any).user;

    try {
      // Parsear el body de respuesta si es string
      let parsedResponseBody;
      try {
        parsedResponseBody = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
      } catch {
        parsedResponseBody = typeof responseBody === 'string' && responseBody.length < 1000
          ? responseBody
          : { _raw: true, _size: responseBody?.length };
      }

      const logData = {
        timestamp: new Date(),
        source: 'backend' as const,
        method: req.method,
        url: req.originalUrl,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        userId: user?._id?.toString() || user?.id,
        userEmail: user?.email,
        userName: user?.name || user?.fullName,
        ip: req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestHeaders: extractHeaders(req.headers),
        requestBody: sanitizeData(req.body),
        requestQuery: Object.keys(req.query).length > 0 ? req.query : undefined,
        requestParams: Object.keys(req.params).length > 0 ? req.params : undefined,
        responseBody: sanitizeData(parsedResponseBody, 5000),
        error: res.statusCode >= 400 ? {
          message: parsedResponseBody?.message || parsedResponseBody?.error || `HTTP ${res.statusCode}`,
          code: parsedResponseBody?.code || String(res.statusCode),
          name: parsedResponseBody?.name || 'HTTPError'
        } : undefined,
        module: extractModule(req.path),
        action: extractAction(req.method, req.path),
        entityId: extractEntityId(req.path),
        entityType: extractEntityType(req.path)
      };

      // Log en consola para debugging inmediato
      const logPrefix = res.statusCode >= 400 ? '❌' : '✅';
      console.log(`${logPrefix} [${req.method}] ${req.path} - ${res.statusCode} (${responseTime}ms) - ${user?.email || 'anonymous'}`);

      // Guardar en archivo local (no en MongoDB para evitar llenar la base de datos)
      // Solo guardar errores (status >= 400) para ahorrar espacio
      if (res.statusCode >= 400) {
        writeToFile('errors', logData);
      }
      // Opcionalmente guardar todos los requests (comentado para ahorrar espacio)
      // writeToFile('requests', logData);
    } catch (err) {
      console.error('Error guardando request log:', err);
    }
  });

  next();
};

// Middleware para loguear errores específicamente
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  console.error(`❌ [ERROR] [${req.method}] ${req.path} - ${err.message}`);
  console.error(err.stack);

  // Guardar error en archivo local (no en MongoDB)
  const errorLogData = {
    timestamp: new Date().toISOString(),
    source: 'backend',
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    statusCode: err.statusCode || 500,
    userId: user?._id?.toString() || user?.id,
    userEmail: user?.email,
    ip: req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
    error: {
      message: err.message,
      stack: err.stack?.substring(0, 500), // Limitar stack trace
      code: err.code,
      name: err.name
    },
    module: extractModule(req.path),
    action: extractAction(req.method, req.path)
  };

  writeToFile('errors', errorLogData);

  next(err);
};
