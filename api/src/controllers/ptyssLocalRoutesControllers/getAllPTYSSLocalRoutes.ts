import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssLocalRouteSchema from "../../database/schemas/ptyssLocalRouteSchema";
import { response } from "../../utils";

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);

const getAllPTYSSLocalRoutes = async (req: Request, res: Response) => {
  try {
    const allRoutes = await PTYSSLocalRoute.find()
      .populate('realClientId', 'type fullName companyName sapCode email phone isActive')
      .sort({ clientName: 1, from: 1, to: 1 });

    // Filtrar rutas placeholder para no mostrarlas al usuario
    const routes = allRoutes.filter(route => 
      route.from !== '__PLACEHOLDER__' && route.to !== '__PLACEHOLDER__'
    );
    
    return response(res, 200, { data: routes });
  } catch (error) {
    console.error('Error obteniendo rutas locales de PTYSS:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al obtener rutas locales de PTYSS',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default getAllPTYSSLocalRoutes; 