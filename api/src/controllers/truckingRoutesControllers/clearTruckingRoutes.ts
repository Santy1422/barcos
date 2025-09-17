import { Request, Response } from "express";
import { response } from "../../utils";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";

const clearTruckingRoutes = async (req: Request, res: Response) => {
  try {
    // Obtener el modelo de TruckingRoute
    const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);
    
    // Eliminar todas las rutas existentes
    const result = await TruckingRoute.deleteMany({});
    
    console.log(`Eliminadas ${result.deletedCount} rutas de trucking`);
    
    return response(res, 200, {
      message: `Base de datos limpiada. Se eliminaron ${result.deletedCount} rutas`,
      data: {
        deletedCount: result.deletedCount
      }
    });

  } catch (error) {
    console.error('Error limpiando rutas de trucking:', error);
    return response(res, 500, {
      message: 'Error interno del servidor al limpiar las rutas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default clearTruckingRoutes;
