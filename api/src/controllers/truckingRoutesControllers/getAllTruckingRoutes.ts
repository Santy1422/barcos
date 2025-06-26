import { Request, Response } from "express";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";

const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

const getAllTruckingRoutes = async (req: Request, res: Response) => {
  try {
    const routes = await TruckingRoute.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: routes
    });
  } catch (error) {
    console.error('Error obteniendo rutas de trucking:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener rutas de trucking',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default getAllTruckingRoutes; 