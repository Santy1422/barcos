import { Request, Response } from "express";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";

const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

const deleteTruckingRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await TruckingRoute.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Ruta de trucking no encontrada'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Ruta de trucking eliminada',
      data: deleted
    });
  } catch (error) {
    console.error('Error eliminando ruta de trucking:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar ruta de trucking',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default deleteTruckingRoute; 