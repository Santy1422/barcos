import { Request, Response } from "express";
import mongoose from "mongoose";
import configSchema from "../../database/schemas/configSchema";

const Config = mongoose.model('Config', configSchema);

const deleteCustomField = async (req: Request, res: Response) => {
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

    const fieldIndex = parseInt(id);
    if (isNaN(fieldIndex) || fieldIndex < 0 || fieldIndex >= config.customFields.length) {
      return res.status(404).json({
        success: false,
        message: 'Campo personalizado no encontrado'
      });
    }

    // Eliminar campo personalizado
    config.customFields.splice(fieldIndex, 1);
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Campo personalizado eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar campo personalizado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default deleteCustomField;