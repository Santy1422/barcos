import { Request, Response } from "express";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";

const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

const updateTruckingRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, origin, destination, containerType, routeType, price } = req.body;

    const updated = await TruckingRoute.findByIdAndUpdate(
      id,
      { name, origin, destination, containerType, routeType, price },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Ruta de trucking no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ruta de trucking actualizada',
      data: updated
    });
  } catch (error) {
    console.error('Error actualizando ruta de trucking:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar ruta de trucking',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default updateTruckingRoute; 