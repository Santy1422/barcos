import { Request, Response } from "express";
import mongoose from "mongoose";
import configSchema from "../../database/schemas/configSchema";

const Config = mongoose.model('Config', configSchema);

const deleteVehicle = async (req: Request, res: Response) => {
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

    const vehicleIndex = parseInt(id);
    if (isNaN(vehicleIndex) || vehicleIndex < 0 || vehicleIndex >= config.vehicles.length) {
      return res.status(404).json({
        success: false,
        message: 'Vehículo no encontrado'
      });
    }

    // Eliminar vehículo
    config.vehicles.splice(vehicleIndex, 1);
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Vehículo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar vehículo',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default deleteVehicle;