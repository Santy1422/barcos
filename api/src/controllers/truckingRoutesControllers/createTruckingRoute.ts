import { Request, Response } from "express";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";

const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

const createTruckingRoute = async (req: Request, res: Response) => {
  try {
    const { name, origin, destination, containerType, routeType, price } = req.body;

    if (!name || !origin || !destination || !containerType || !routeType || !price) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Verificar si ya existe una ruta con el mismo nombre
    const existingRoute = await TruckingRoute.findOne({ name });
    if (existingRoute) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una ruta con este nombre'
      });
    }

    const newRoute = new TruckingRoute({ name, origin, destination, containerType, routeType, price });
    await newRoute.save();

    res.status(201).json({
      success: true,
      message: 'Ruta de trucking creada exitosamente',
      data: newRoute
    });
  } catch (error) {
    console.error('Error creando ruta de trucking:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear ruta de trucking',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default createTruckingRoute; 