import { Types } from "mongoose";
import jwt from 'jsonwebtoken'
import { userConexion } from "../config/env";
import { ClientError } from "../utils/errors";

export const jwtUtils = (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token)
      next(new ClientError('Missing token! Authorization=undefined', 400))
    try {
      const decodedToken = decodeToken(token) as TokenSignature
      req.user = decodedToken;
      next();
    } catch (error) {
      next(new ClientError('Token falló al decodificarse!', 400))
    }
}
  export type TokenSignature = { id?: string, mongoId: string}
  
  export const firmarToken = (payload:TokenSignature) => {
    return jwt.sign(payload, userConexion.jwtAcces, { expiresIn: '6000h' });
  };
  
  export const decodeToken = (token:string) => {
      return jwt.verify(token, userConexion.jwtAcces);
  };
  
  
  