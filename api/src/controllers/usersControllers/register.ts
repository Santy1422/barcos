import { users } from "../../database";
import { Email, sendEmail } from "../../helpers/sendEmails";
import { firmarToken } from "../../middlewares/jwtUtils";
import response from "../../utils/response";
const bcrypt = require('bcrypt');

export default async (req, res) => {
  try {
    const { username, fullName, name, lastName, email, password, role, modules } = req.body;
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
    
    // Crear usuario con contraseña hasheada
    const userData = {
      username,
      fullName,
      name,
      lastName,
      email,
      password: hashedPassword,
      role: role || 'administrador',
      modules: modules || ['trucking', 'shipchandler', 'agency'],
      isActive: true
    };
    
    const user = await users.create(userData);
    
  // Generar token
    const token = await firmarToken({ mongoId: user._id.toString() });
    
    // Respuesta sin la contraseña
    const userResponse = {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      modules: user.modules,
      createdAt: user.createdAt
    };
    console.log('Usuario registrado:', userResponse);
    return response(res, 200, { user: userResponse, token: token });
    
  } catch (error) {
    console.error('Error en registro:', error);
    return response(res, 500, { error: "Error interno del servidor" });
  }
}
