import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

// Cache para almacenar contadores de rate limit
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Middleware de autenticación para BI
export const biAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Verificar API Key en headers
  const apiKey = req.headers['x-api-key'] as string;
  const bearerToken = req.headers.authorization;
  
  // Opción 1: Autenticación con API Key para Power BI
  if (apiKey) {
    const validApiKey = process.env.POWERBI_API_KEY || 'default-powerbi-api-key-change-in-production';
    
    if (apiKey !== validApiKey) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid API Key',
        message: 'The provided API key is not valid for Power BI access'
      });
    }
    
    // Aplicar rate limiting para API Key
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hora
    const maxRequests = 1000; // 1000 requests por hora
    
    const clientData = rateLimitStore.get(clientIp) || { count: 0, resetTime: now + windowMs };
    
    // Reset si ha pasado el tiempo
    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + windowMs;
    }
    
    clientData.count++;
    rateLimitStore.set(clientIp, clientData);
    
    if (clientData.count > maxRequests) {
      return res.status(429).json({ 
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Maximum ${maxRequests} requests per hour allowed.`,
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
    
    // Agregar información de rate limit en headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - clientData.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(clientData.resetTime).toISOString());
    
    // Agregar contexto de BI al request
    (req as any).biContext = {
      authenticated: true,
      method: 'api-key',
      clientIp,
      requestCount: clientData.count
    };
    
    return next();
  }
  
  // Opción 2: Autenticación con JWT Bearer Token (para usuarios normales)
  if (bearerToken && bearerToken.startsWith('Bearer ')) {
    const token = bearerToken.slice(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      
      // Verificar que el usuario tenga permisos para acceder a analytics
      if (decoded.role && (
        decoded.role.includes('administrador') || 
        decoded.role.includes('analytics') ||
        decoded.role.includes('facturacion')
      )) {
        (req as any).user = decoded;
        (req as any).biContext = {
          authenticated: true,
          method: 'jwt',
          userId: decoded.id,
          username: decoded.username,
          role: decoded.role
        };
        return next();
      } else {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient permissions',
          message: 'User does not have permission to access analytics data'
        });
      }
    } catch (error) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token',
        message: 'The provided JWT token is invalid or expired'
      });
    }
  }
  
  // Si no hay autenticación
  return res.status(401).json({ 
    success: false,
    error: 'Authentication required',
    message: 'Please provide either an API Key (x-api-key header) or a Bearer token'
  });
};

// Rate limiter específico para endpoints de BI
export const biRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por ventana
  message: {
    success: false,
    error: 'Too many requests from this IP',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for authenticated JWT users with admin role
    const user = (req as any).user;
    return user && user.role && user.role.includes('administrador');
  }
});

// Middleware de caché para respuestas
export const biCacheMiddleware = (duration: number = 300) => {
  const cache = new Map<string, { data: any; expiry: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Solo cachear GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Generar cache key basado en URL y query params
    const cacheKey = `${req.originalUrl}`;
    const cached = cache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      // Agregar header para indicar que es desde caché
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-TTL', Math.ceil((cached.expiry - Date.now()) / 1000).toString());
      return res.json(cached.data);
    }
    
    // Override del método json para cachear la respuesta
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      // Solo cachear respuestas exitosas
      if (res.statusCode === 200) {
        cache.set(cacheKey, {
          data,
          expiry: Date.now() + (duration * 1000)
        });
        
        // Limpiar caché antiguo
        cache.forEach((value, key) => {
          if (value.expiry < Date.now()) {
            cache.delete(key);
          }
        });
      }
      
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };
    
    next();
  };
};

// Middleware de validación de parámetros
export const validateAnalyticsParams = (req: Request, res: Response, next: NextFunction) => {
  const { startDate, endDate, limit } = req.query;
  
  // Validar fechas si están presentes
  if (startDate && !isValidDate(startDate as string)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid startDate',
      message: 'startDate must be a valid ISO date string'
    });
  }
  
  if (endDate && !isValidDate(endDate as string)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid endDate',
      message: 'endDate must be a valid ISO date string'
    });
  }
  
  // Validar rango de fechas
  if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    if (start > end) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date range',
        message: 'startDate must be before or equal to endDate'
      });
    }
    
    // Límite máximo de rango (1 año)
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 año en ms
    if (end.getTime() - start.getTime() > maxRange) {
      return res.status(400).json({
        success: false,
        error: 'Date range too large',
        message: 'Maximum date range is 1 year'
      });
    }
  }
  
  // Validar límite
  if (limit) {
    const limitNum = parseInt(limit as string);
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit',
        message: 'Limit must be a number between 1 and 100000'
      });
    }
  }
  
  next();
};

// Función auxiliar para validar fechas
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export default biAuthMiddleware;