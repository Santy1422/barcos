import { Request, Response } from "express";
import mongoose from "mongoose";
import configSchema from "../../database/schemas/configSchema";

const Config = mongoose.model('Config', configSchema);

const createRoute = async (req: Request, res: Response) => {
  try {
    const { name, origin, destination, distance } = req.body;
            //@ts-ignore

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!name || !origin || !destination || !distance) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, origen, destino y distancia son requeridos'
      });
    }

    let config = await Config.findOne({ userId });
    
    if (!config) {
      config = new Config({
        userId,
        drivers: [],
        vehicles: [],
        routes: [],
        customFields: []
      });
    }

    // Verificar si ya existe una ruta con el mismo nombre
    const existingRoute = config.routes.find(route => route.name === name);
    if (existingRoute) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una ruta con este nombre'
      });
    }

    // Agregar nueva ruta
    config.routes.push({ name, origin, destination, distance });
    await config.save();

    res.status(201).json({
      success: true,
      message: 'Ruta creada exitosamente',
      data: config.routes[config.routes.length - 1]
    });
  } catch (error) {
    console.error('Error creating route:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear ruta',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default createRoute;