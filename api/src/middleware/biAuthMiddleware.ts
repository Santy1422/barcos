import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import usersSchema from '../database/schemas/usersSchema';
import { userConexion } from '../config/env';

// Cache para almacenar contadores de rate limit
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cache para usuarios (evitar consultas repetidas a la BD)
const userCache = new Map<string, { user: any; expiry: number }>();
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Helper para obtener el modelo de User
const getUserModel = () => {
  try {
    return mongoose.model('User');
  } catch {
    return mongoose.model('User', usersSchema);
  }
};

// Middleware de autenticación para BI
export const biAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
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
      // Usar la misma clave JWT que el resto del sistema
      const jwtSecret = userConexion.jwtAcces || process.env.JWT_ACCESCODE || 'your-secret-key';
      const decoded = jwt.verify(token, jwtSecret) as any;

      // Obtener el ID del usuario (puede ser mongoId o id)
      const userId = decoded.mongoId || decoded.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token structure',
          message: 'Token does not contain user identifier'
        });
      }

      // Verificar cache primero
      const cached = userCache.get(userId);
      let userRoles: string[] = [];
      let username = '';

      if (cached && cached.expiry > Date.now()) {
        userRoles = cached.user.roles || (cached.user.role ? [cached.user.role] : []);
        username = cached.user.username || cached.user.email;
      } else {
        // Buscar usuario en la base de datos
        try {
          const User = getUserModel();
          const user = await User.findById(userId).select('roles role username email').lean();

          if (user) {
            userRoles = (user as any).roles || ((user as any).role ? [(user as any).role] : []);
            username = (user as any).username || (user as any).email;

            // Guardar en cache
            userCache.set(userId, {
              user: { roles: userRoles, role: (user as any).role, username, email: (user as any).email },
              expiry: Date.now() + USER_CACHE_TTL
            });
          }
        } catch (dbError) {
          console.error('Error fetching user for analytics:', dbError);
          // Si falla la BD, continuar con los datos del token si existen
          userRoles = decoded.roles || (decoded.role ? [decoded.role] : []);
          username = decoded.username || decoded.email || '';
        }
      }

      // Verificar que el usuario tenga permisos para acceder a analytics
      const hasPermission = userRoles.some(role =>
        ['administrador', 'analytics', 'facturacion'].includes(role)
      );

      if (hasPermission) {
        (req as any).user = { ...decoded, roles: userRoles, username };
        (req as any).biContext = {
          authenticated: true,
          method: 'jwt',
          userId,
          username,
          role: userRoles
        };
        return next();
      } else {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: 'User does not have permission to access analytics data. Required roles: administrador, analytics, or facturacion'
        });
      }
    } catch (error: any) {
      console.error('JWT verification error:', error.message);
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