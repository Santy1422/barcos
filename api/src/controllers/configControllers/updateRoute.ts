import { Request, Response } from "express";
import mongoose from "mongoose";
import configSchema from "../../database/schemas/configSchema";

const Config = mongoose.model('Config', configSchema);

const updateRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, origin, destination, distance } = req.body;
          //@ts-ignore

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const config = await Config.findOne({ userId });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    const routeIndex = parseInt(id);
    if (isNaN(routeIndex) || routeIndex < 0 || routeIndex >= config.routes.length) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    // Verificar si el nuevo nombre ya existe en otra ruta
    if (name) {
      const existingRoute = config.routes.find((route, index) => 
        route.name === name && index !== routeIndex
      );
      if (existingRoute) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una ruta con este nombre'
        });
      }
    }

    // Actualizar ruta
    if (name) config.routes[routeIndex].name = name;
    if (origin) config.routes[routeIndex].origin = origin;
    if (destination) config.routes[routeIndex].destination = destination;
    if (distance) config.routes[routeIndex].distance = distance;

    await config.save();

    res.status(200).json({
      success: true,
      message: 'Ruta actualizada exitosamente',
      data: config.routes[routeIndex]
    });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar ruta',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default updateRoute;