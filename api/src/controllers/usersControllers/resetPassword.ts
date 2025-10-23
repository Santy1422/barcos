import { users } from "../../database";
import response from "../../utils/response";
const bcrypt = require('bcrypt');

export default async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    // Solo administradores pueden resetear contraseñas
    // Soportar tanto roles (array) como role (único) para compatibilidad
    const userRoles = req.user.roles || (req.user.role ? [req.user.role] : [])
    if (!userRoles.includes('administrador')) {
      return response(res, 403, { error: "No tienes permisos para resetear contraseñas" });
    }

    // Validar que se proporcione una nueva contraseña
    if (!newPassword || newPassword.length < 6) {
      return response(res, 400, { error: "La nueva contraseña debe tener al menos 6 caracteres" });
    }

    // Buscar el usuario
    const user = await users.findById(userId);
    
    if (!user) {
      return response(res, 404, { error: "Usuario no encontrado" });
    }

    // Hash de la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar la contraseña
    user.password = hashedPassword;
    await user.save();

    console.log(`Contraseña reseteada para usuario: ${user.email} por administrador: ${req.user.email}`);

    return response(res, 200, { 
      message: "Contraseña reseteada correctamente",
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    return response(res, 500, { error: "Error interno del servidor" });
  }
};
