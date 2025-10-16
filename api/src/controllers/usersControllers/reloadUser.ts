import { users } from "../../database";
import { firmarToken } from "../../middlewares/jwtUtils";
import response from "../../utils/response";

export default async (req, res) => {
  try {
    const user = await users.findById(req.user.mongoId);
    
    if (!user) {
      return response(res, 404, { error: "El usuario no existe" });
    }

    // Asegurar valores por defecto para compatibilidad con usuarios existentes
    const modules = user.modules || [];
    const isActive = user.isActive !== undefined ? user.isActive : true;
    const role = user.role || 'administrador';
    
    // Si el usuario no tiene módulos y es admin, asignarle todos
    if (role === 'administrador' && modules.length === 0) {
      user.modules = ['trucking', 'shipchandler', 'agency'];
      user.isActive = true;
      await user.save();
    }

    // Respuesta sin la contraseña y con campos mapeados correctamente
    const userResponse = {
      id: user._id,
      username: user.username || user.email.split('@')[0],
      fullName: user.fullName || user.name,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      modules: user.modules || [],
      isActive: user.isActive !== undefined ? user.isActive : true,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    };

    return response(res, 200, { user: userResponse });
    
  } catch (error) {
    console.error('Error en reloadUser:', error);
    return response(res, 500, { error: "Error interno del servidor" });
  }
}
