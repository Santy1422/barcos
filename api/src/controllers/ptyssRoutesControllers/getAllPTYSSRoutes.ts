import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssRouteSchema from "../../database/schemas/ptyssRouteSchema";
import { response } from "../../utils";

const PTYSSRoute = mongoose.model('PTYSSRoute', ptyssRouteSchema);

const getAllPTYSSRoutes = async (req: Request, res: Response) => {
  try {
    const routes = await PTYSSRoute.find().sort({ createdAt: -1 });
    
    return response(res, 200, { data: routes });
  } catch (error) {
    console.error('Error obteniendo rutas de PTYSS:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al obtener rutas de PTYSS',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default getAllPTYSSRoutes; 