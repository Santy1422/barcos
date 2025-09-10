import { Request, Response } from "express";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";
import { response } from "../../utils";

const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

const createTruckingRoute = async (req: Request, res: Response) => {
  try {
    const { name, origin, destination, containerType, routeType, price, status } = req.body;

    if (!name || !origin || !destination || !containerType || !routeType || !price || !status) {
      return response(res, 400, { message: 'Todos los campos son requeridos' });
    }

    // Verificar si ya existe una ruta con la misma combinación de nombre + tipo de contenedor + tipo de ruta
    const existingRoute = await TruckingRoute.findOne({ 
      name, 
      containerType, 
      routeType 
    });
    if (existingRoute) {
      return response(res, 400, { 
        message: `Ya existe una ruta con el nombre "${name}", tipo de contenedor "${containerType}" y tipo de ruta "${routeType}"` 
      });
    }

    const newRoute = new TruckingRoute({ name, origin, destination, containerType, routeType, price, status });
    await newRoute.save();

    return response(res, 201, { 
      message: 'Ruta de trucking creada exitosamente',
      data: newRoute
    });
  } catch (error) {
    console.error('Error creando ruta de trucking:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al crear ruta de trucking',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default createTruckingRoute; 