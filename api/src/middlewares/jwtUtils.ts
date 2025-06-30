import { Types } from "mongoose";
import jwt from 'jsonwebtoken'
import { userConexion } from "../config/env";
import { ClientError } from "../utils/errors";
import { users } from "../database";

export const jwtUtils = async (req, res, next) => {
    console.log("=== JWT UTILS MIDDLEWARE ===");
    console.log("Headers authorization:", req.headers.authorization);
    
    const token = req.headers.authorization?.split('Bearer ')[1];
    console.log("Token extraído:", token ? token.substring(0, 20) + "..." : "NO TOKEN");
    
    if (!token) {
      console.log("❌ No hay token en headers");
      return next(new ClientError('Missing token! Authorization=undefined', 400))
    }
    
    try {
      console.log("🔍 Decodificando token...");
      const decodedToken = decodeToken(token) as TokenSignature
      console.log("Token decodificado:", decodedToken);
      
      // Obtener información completa del usuario desde la base de datos
      console.log("🔍 Buscando usuario en BD con mongoId:", decodedToken.mongoId);
      const user = await users.findById(decodedToken.mongoId)
      console.log("Usuario encontrado:", user ? "SÍ" : "NO");
      
      if (!user) {
        console.log("❌ Usuario no encontrado en BD");
        return next(new ClientError('Usuario no encontrado', 401))
      }
      
      // Asegurar que req.user tenga toda la información necesaria
      req.user = {
        _id: user._id, // Agregar _id para compatibilidad
        id: user._id.toString(),
        mongoId: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        modules: user.modules,
        isActive: user.isActive
      };
      console.log("✅ req.user establecido:", req.user);
      next();
    } catch (error) {
      console.log("❌ Error decodificando token:", error);
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
  
  
  