import { Request, Response } from "express";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";
import { response } from "../../utils";

const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

const getAllTruckingRoutes = async (req: Request, res: Response) => {
  try {
    const routes = await TruckingRoute.find().sort({ createdAt: -1 });
    
    return response(res, 200, { data: routes });
  } catch (error) {
    console.error('Error obteniendo rutas de trucking:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al obtener rutas de trucking',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default getAllTruckingRoutes; 