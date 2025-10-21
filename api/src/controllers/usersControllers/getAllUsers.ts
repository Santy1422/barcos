import { users } from "../../database";
import response from "../../utils/response";

export default async (req, res) => {
  try {
    // Solo administradores pueden ver todos los usuarios
    // Soportar tanto roles (array) como role (único) para compatibilidad
    const userRoles = req.user.roles || (req.user.role ? [req.user.role] : [])
    if (!userRoles.includes('administrador')) {
      return response(res, 403, { error: "No tienes permisos para ver todos los usuarios" });
    }

    // Obtener todos los usuarios sin la contraseña
    const allUsers = await users.find({}).select('-password').sort({ createdAt: -1 });
    
    const usersResponse = allUsers.map(user => {
      // Migrar role único a roles array para usuarios antiguos
      const roles = user.roles || (user.role ? [user.role] : [])
      
      return {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        role: user.role, // Mantener para compatibilidad
        roles: roles,
        modules: user.modules,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

    return response(res, 200, { users: usersResponse });
    
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return response(res, 500, { error: "Error interno del servidor" });
  }
}

