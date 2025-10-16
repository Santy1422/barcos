
import { response } from "../../utils";
import { users } from "../../database";
import { firmarToken } from "../../middlewares/jwtUtils";
const bcrypt = require('bcrypt');

export default async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Datos de login:', req.body);
    if (!email || !password) {
      return response(res, 400, { error: "Email y contraseña son requeridos" });
    }
    
    // Buscar usuario por email
    const user = await users.findOne({ email: email })
    
    if (!user) {
      return response(res, 400, { error: "Credenciales inválidas" });
    }
    
    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return response(res, 400, { error: "Credenciales inválidas" });
    }
    
    // Verificar si el usuario está activo
    if (!user.isActive) {
      return response(res, 403, { 
        error: user.role === 'pendiente' 
          ? "Tu cuenta está pendiente de activación. Por favor, contacta al administrador."
          : "Tu cuenta ha sido desactivada. Contacta al administrador para más información."
      });
    }
    
    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();
    console.log('Último login actualizado:', user);
    // Generar token
    const token = await firmarToken({ mongoId: user._id.toString() });
    
    // Asegurar valores por defecto para compatibilidad con usuarios existentes
    const modules = user.modules || [];
    const isActive = user.isActive !== undefined ? user.isActive : true;
    const role = user.role || 'administrador';
    
    // Si el usuario no tiene módulos y es admin, asignarle todos automáticamente
    if (role === 'administrador' && modules.length === 0) {
      user.modules = ['trucking', 'shipchandler', 'agency'];
      user.isActive = true;
      await user.save();
    }
    
    // Respuesta sin la contraseña
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
    console.log('Usuario autenticado:', userResponse);
    return response(res, 200, { user: userResponse, token: token });
    
  } catch (error) {
    console.error('Error en login:', error);
    return response(res, 500, { error: "Error interno del servidor" });
  }
};