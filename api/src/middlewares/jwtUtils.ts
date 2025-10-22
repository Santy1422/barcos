import { Types } from "mongoose";
import jwt from 'jsonwebtoken'
import { userConexion } from "../config/env";
import { ClientError } from "../utils/errors";
import { users } from "../database";

export const jwtUtils = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      console.log("❌ JWT: No token provided");
      return next(new ClientError('Missing token! Authorization=undefined', 400))
    }
    
    try {
      const decodedToken = decodeToken(token) as TokenSignature
      
      // Obtener información completa del usuario desde la base de datos
      const user = await users.findById(decodedToken.mongoId)
      
      if (!user) {
        console.log("❌ JWT: User not found for mongoId:", decodedToken.mongoId);
        return next(new ClientError('Usuario no encontrado', 401))
      }
      
      // Asegurar que req.user tenga toda la información necesaria
      req.user = {
        _id: user._id,
        id: user._id.toString(),
        mongoId: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role, // Mantener para compatibilidad
        roles: user.roles || (user.role ? [user.role] : []), // Agregar roles (soportar múltiples roles)
        modules: user.modules,
        isActive: user.isActive
      };
      
      console.log('✅ JWT: Usuario autenticado:', {
        email: req.user.email,
        role: req.user.role,
        roles: req.user.roles,
        modules: req.user.modules
      });
      
      next();
    } catch (error) {
      console.log("❌ JWT: Token decode error:", error.message);
      return next(new ClientError('Token falló al decodificarse!', 400))
    }
}

export type TokenSignature = { id?: string, mongoId: string}

export const firmarToken = (payload:TokenSignature) => {
  return jwt.sign(payload, userConexion.jwtAcces, { expiresIn: '6000h' });
};

export const decodeToken = (token:string) => {
    return jwt.verify(token, userConexion.jwtAcces);
};
  
  
  