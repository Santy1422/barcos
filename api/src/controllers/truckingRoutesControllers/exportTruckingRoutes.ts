import { Request, Response } from "express";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";
import { response } from "../../utils";

const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

const exportTruckingRoutes = async (req: Request, res: Response) => {
  try {
    // Obtener todas las rutas sin paginación para exportación
    const routes = await TruckingRoute.find({})
      .sort({ createdAt: -1 })
      .lean();

    return response(res, 200, { 
      data: routes,
      total: routes.length
    });
  } catch (error) {
    console.error('Error exportando rutas de trucking:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al exportar rutas de trucking',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default exportTruckingRoutes;
