import { users } from "../../database";
import response from "../../utils/response";
const bcrypt = require('bcrypt');

export default async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, fullName, name, lastName, email, role, roles, modules, isActive, password } = req.body;

    // Solo administradores pueden actualizar usuarios
    // Soportar tanto roles (array) como role (único) para compatibilidad
    const userRoles = req.user.roles || (req.user.role ? [req.user.role] : [])
    if (!userRoles.includes('administrador')) {
      return response(res, 403, { error: "No tienes permisos para actualizar usuarios" });
    }

    // Buscar el usuario a actualizar
    const user = await users.findById(userId);
    
    if (!user) {
      return response(res, 404, { error: "Usuario no encontrado" });
    }

    // No permitir que el admin se desactive a sí mismo
    if (userId === req.user.id && isActive === false) {
      return response(res, 400, { error: "No puedes desactivar tu propio usuario" });
    }

    // Verificar si el username o email ya existen (si están siendo cambiados)
    if (username && username !== user.username) {
      const existingUser = await users.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return response(res, 400, { error: "El nombre de usuario ya existe" });
      }
    }

    if (email && email !== user.email) {
      const existingUser = await users.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return response(res, 400, { error: "El email ya existe" });
      }
    }

    // Actualizar campos
    if (username) user.username = username;
    if (fullName) user.fullName = fullName;
    if (name) user.name = name;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    
    // Soportar tanto roles (array) como role (único) para compatibilidad
    if (roles !== undefined) {
      user.roles = roles;
    } else if (role) {
      user.roles = [role];
    }
    
    if (modules !== undefined) user.modules = modules;
    if (isActive !== undefined) user.isActive = isActive;
    
    // Si se proporciona nueva contraseña, hashearla
    if (password) {
      const saltRounds = 10;
      user.password = await bcrypt.hash(password, saltRounds);
    }

    await user.save();

    // Respuesta sin la contraseña
    const userResponse = {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      roles: user.roles,
      modules: user.modules,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return response(res, 200, { user: userResponse, message: "Usuario actualizado correctamente" });
    
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return response(res, 500, { error: "Error interno del servidor" });
  }
}

