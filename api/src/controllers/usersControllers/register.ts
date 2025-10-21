import { users } from "../../database";
import { Email, sendEmail } from "../../helpers/sendEmails";
import { firmarToken } from "../../middlewares/jwtUtils";
import response from "../../utils/response";
const bcrypt = require('bcrypt');

export default async (req, res) => {
  try {
    const { username, fullName, name, lastName, email, password, role, roles, modules, isActive } = req.body;
    console.log('Datos de registro:', req.body);
    // Verificar si el usuario ya existe
    const existingUser = await users.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return response(res, 400, { error: "El usuario ya existe" });
    }
    
    // Hash de la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Determinar si es un administrador creando el usuario
    // Si viene con un token de autorización, es un admin creando el usuario
    const isAdminCreating = !!req.headers.authorization;
    
    // Soportar tanto roles (array) como role (único) para compatibilidad
    const userRoles = roles || (role ? [role] : ['pendiente'])
    
    // Crear usuario con contraseña hasheada
    // Si es registro público, crear inactivo por defecto
    // Si es un admin creando, respetar el valor de isActive enviado
    const userData = {
      username,
      fullName,
      name,
      lastName,
      email,
      password: hashedPassword,
      roles: userRoles,
      modules: modules || [],
      isActive: isAdminCreating ? (isActive !== undefined ? isActive : false) : false
    };
    
    const user = await users.create(userData);
    
    // Respuesta sin la contraseña y sin token
    // Los usuarios pendientes NO reciben token hasta ser activados
    const userResponse = {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      modules: user.modules,
      isActive: user.isActive,
      createdAt: user.createdAt,
      message: "Cuenta creada exitosamente. Un administrador debe activar tu cuenta antes de que puedas acceder."
    };
    console.log('Usuario registrado (pendiente):', userResponse);
    return response(res, 201, { user: userResponse });
    
  } catch (error) {
    console.error('Error en registro:', error);
    return response(res, 500, { error: "Error interno del servidor" });
  }
}
