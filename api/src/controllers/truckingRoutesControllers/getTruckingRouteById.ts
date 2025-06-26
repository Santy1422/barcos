import { Request, Response } from "express";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";

const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

const getTruckingRouteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const route = await TruckingRoute.findById(id);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Ruta de trucking no encontrada'
      });
    }
    res.status(200).json({
      success: true,
      data: route
    });
  } catch (error) {
    console.error('Error obteniendo ruta de trucking por ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener ruta de trucking',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default getTruckingRouteById; 