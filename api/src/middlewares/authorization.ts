import { response } from '../utils';

// Middleware para verificar roles
export const requireRole = (allowedRoles: string[]) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return response(res, 401, { error: 'Usuario no autenticado' });
    }
    
    if (!allowedRoles.includes(userRole)) {
      return response(res, 403, { error: 'No tienes permisos para esta acción' });
    }
    
    next();
  };
};

// Middleware específicos por rol
export const requireAdmin = requireRole(['administrador']);
export const requireAdminOrOperations = requireRole(['administrador', 'operaciones']);
export const requireAnyRole = requireRole(['administrador', 'operaciones', 'facturacion']);