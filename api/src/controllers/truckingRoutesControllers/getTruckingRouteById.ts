import { Request, Response } from "express";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";
import { response } from "../../utils";

const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

const getTruckingRouteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('Obteniendo ruta de trucking por ID:', id);
    
    const route = await TruckingRoute.findById(id);
    if (!route) {
      return response(res, 404, { message: 'Ruta de trucking no encontrada' });
    }
    
    console.log('Ruta encontrada:', route);
    return response(res, 200, { data: route });
  } catch (error) {
    console.error('Error obteniendo ruta de trucking por ID:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al obtener ruta de trucking',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default getTruckingRouteById; 