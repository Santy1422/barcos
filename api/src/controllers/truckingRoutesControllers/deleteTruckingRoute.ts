import { Request, Response } from "express";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";
import { response } from "../../utils";

const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

const deleteTruckingRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('Eliminando ruta de trucking:', id);
    
    const deleted = await TruckingRoute.findByIdAndDelete(id);
    if (!deleted) {
      return response(res, 404, { message: 'Ruta de trucking no encontrada' });
    }
    
    console.log('Ruta eliminada exitosamente:', deleted);
    return response(res, 200, { 
      message: 'Ruta de trucking eliminada',
      data: deleted
    });
  } catch (error) {
    console.error('Error eliminando ruta de trucking:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al eliminar ruta de trucking',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default deleteTruckingRoute; 