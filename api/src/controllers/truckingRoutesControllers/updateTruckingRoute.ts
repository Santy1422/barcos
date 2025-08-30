import { Request, Response } from "express";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";
import { response } from "../../utils";

const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

const updateTruckingRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, origin, destination, containerType, routeType, price } = req.body;

    console.log('Actualizando ruta de trucking:', { id, updates: req.body });

    // Verificar si ya existe otra ruta con la misma combinación de nombre + tipo de contenedor + tipo de ruta
    const existingRoute = await TruckingRoute.findOne({ 
      name, 
      containerType, 
      routeType,
      _id: { $ne: id } // Excluir la ruta actual
    });
    if (existingRoute) {
      return response(res, 400, { 
        message: `Ya existe una ruta con el nombre "${name}", tipo de contenedor "${containerType}" y tipo de ruta "${routeType}"` 
      });
    }

    const updated = await TruckingRoute.findByIdAndUpdate(
      id,
      { name, origin, destination, containerType, routeType, price },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return response(res, 404, { message: 'Ruta de trucking no encontrada' });
    }

    console.log('Ruta actualizada exitosamente:', updated);
    return response(res, 200, { 
      message: 'Ruta de trucking actualizada',
      data: updated
    });
  } catch (error) {
    console.error('Error actualizando ruta de trucking:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al actualizar ruta de trucking',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default updateTruckingRoute; 