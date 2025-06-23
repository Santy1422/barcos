import { Request, Response } from "express";
import mongoose from "mongoose";
import configSchema from "../../database/schemas/configSchema";

const Config = mongoose.model('Config', configSchema);

const deleteRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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

    // Eliminar ruta
    config.routes.splice(routeIndex, 1);
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Ruta eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar ruta',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default deleteRoute;