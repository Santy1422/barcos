import { Request, Response } from "express";
import mongoose from "mongoose";
import configSchema from "../../database/schemas/configSchema";

const Config = mongoose.model('Config', configSchema);

const deleteDriver = async (req: Request, res: Response) => {
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

    const driverIndex = parseInt(id);
    if (isNaN(driverIndex) || driverIndex < 0 || driverIndex >= config.drivers.length) {
      return res.status(404).json({
        success: false,
        message: 'Conductor no encontrado'
      });
    }

    // Eliminar conductor
    config.drivers.splice(driverIndex, 1);
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Conductor eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar conductor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default deleteDriver;