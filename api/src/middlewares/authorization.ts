import { response } from '../utils';

// Middleware para verificar roles
export const requireRole = (allowedRoles: string[]) => {
  return (req, res, next) => {
    // Soportar tanto roles múltiples como rol único
    const userRoles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    
    console.log('🔐 requireRole - Verificando roles:', {
      userEmail: req.user?.email,
      userRoles,
      allowedRoles,
      reqUserComplete: req.user
    });
    
    if (userRoles.length === 0) {
      console.log('❌ requireRole - Sin roles asignados');
      return response(res, 401, { error: 'Usuario no autenticado' });
    }
    
    // Usuarios pendientes no tienen acceso a nada
    if (userRoles.includes('pendiente') && userRoles.length === 1) {
      console.log('❌ requireRole - Usuario pendiente');
      return response(res, 403, { error: 'Tu cuenta está pendiente de activación. Contacta al administrador.' });
    }
    
    // Verificar si alguno de los roles del usuario está en los roles permitidos
    const hasPermission = userRoles.some(role => allowedRoles.includes(role));
    
    console.log('🔐 requireRole - Resultado:', { hasPermission });
    
    if (!hasPermission) {
      console.log('❌ requireRole - Sin permisos. Roles del usuario:', userRoles, 'Roles permitidos:', allowedRoles);
      return response(res, 403, { error: 'No tienes permisos para esta acción' });
    }
    
    console.log('✅ requireRole - Permiso concedido');
    next();
  };
};

// Middleware para verificar acceso a módulos
export const requireModule = (requiredModule: string) => {
  return (req, res, next) => {
    const userModules = req.user?.modules;
    // Soportar tanto roles múltiples como rol único
    const userRoles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    
    console.log('🔐 requireModule - Verificando módulo:', {
      userEmail: req.user?.email,
      userRoles,
      userModules,
      requiredModule
    });
    
    if (userRoles.length === 0) {
      console.log('❌ requireModule - Sin roles asignados');
      return response(res, 401, { error: 'Usuario no autenticado' });
    }
    
    // Usuarios pendientes no tienen acceso a nada
    if (userRoles.includes('pendiente') && userRoles.length === 1) {
      console.log('❌ requireModule - Usuario pendiente');
      return response(res, 403, { error: 'Tu cuenta está pendiente de activación. Contacta al administrador.' });
    }
    
    // Los administradores tienen acceso a todos los módulos
    if (userRoles.includes('administrador')) {
      console.log('✅ requireModule - Usuario administrador, acceso concedido');
      return next();
    }
    
    // Verificar si el usuario tiene el módulo asignado
    if (!userModules || !userModules.includes(requiredModule)) {
      console.log('❌ requireModule - Módulo no asignado. Módulos del usuario:', userModules, 'Requerido:', requiredModule);
      return response(res, 403, { error: `No tienes acceso al módulo ${requiredModule}` });
    }
    
    console.log('✅ requireModule - Módulo verificado correctamente');
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