import { users } from "../../database";
import response from "../../utils/response";

export default async (req, res) => {
  try {
    const { userId } = req.params;

    // Solo administradores pueden eliminar usuarios
    if (req.user.role !== 'administrador') {
      return response(res, 403, { error: "No tienes permisos para eliminar usuarios" });
    }

    // No permitir que el admin se elimine a sí mismo
    if (userId === req.user.id) {
      return response(res, 400, { error: "No puedes eliminar tu propio usuario" });
    }

    // Buscar y eliminar el usuario
    const user = await users.findByIdAndDelete(userId);
    
    if (!user) {
      return response(res, 404, { error: "Usuario no encontrado" });
    }

    return response(res, 200, { message: "Usuario eliminado correctamente" });
    
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return response(res, 500, { error: "Error interno del servidor" });
  }
}

