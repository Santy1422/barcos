import { response } from '../utils';

// Middleware para verificar roles
export const requireRole = (allowedRoles: string[]) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return response(res, 401, { error: 'Usuario no autenticado' });
    }
    
    // Usuarios pendientes no tienen acceso a nada
    if (userRole === 'pendiente') {
      return response(res, 403, { error: 'Tu cuenta está pendiente de activación. Contacta al administrador.' });
    }
    
    if (!allowedRoles.includes(userRole)) {
      return response(res, 403, { error: 'No tienes permisos para esta acción' });
    }
    
    next();
  };
};

// Middleware para verificar acceso a módulos
export const requireModule = (requiredModule: string) => {
  return (req, res, next) => {
    const userModules = req.user?.modules;
    const userRole = req.user?.role;
    
    if (!userRole) {
      return response(res, 401, { error: 'Usuario no autenticado' });
    }
    
    // Usuarios pendientes no tienen acceso a nada
    if (userRole === 'pendiente') {
      return response(res, 403, { error: 'Tu cuenta está pendiente de activación. Contacta al administrador.' });
    }
    
    // Los administradores tienen acceso a todos los módulos
    if (userRole === 'administrador') {
      return next();
    }
    
    // Verificar si el usuario tiene el módulo asignado
    if (!userModules || !userModules.includes(requiredModule)) {
      return response(res, 403, { error: `No tienes acceso al módulo ${requiredModule}` });
    }
    
    next();
  };
};

// Middleware específicos por rol
export const requireAdmin = requireRole(['administrador']);
export const requireAdminOrOperations = requireRole(['administrador', 'operaciones']);
export const requireAnyRole = requireRole(['administrador', 'operaciones', 'facturacion']);

// Middleware específicos por módulo
export const requireTruckingModule = requireModule('trucking');
export const requireShipchandlerModule = requireModule('shipchandler');
export const requireAgencyModule = requireModule('agency');