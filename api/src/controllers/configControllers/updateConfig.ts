import { Request, Response } from "express";
import mongoose from "mongoose";
import configSchema from "../../database/schemas/configSchema";

const Config = mongoose.model('Config', configSchema);

const updateConfig = async (req: Request, res: Response) => {
  try {
    const { section, data } = req.body;
          //@ts-ignore

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!section || !data) {
      return res.status(400).json({
        success: false,
        message: 'Sección y datos son requeridos'
      });
    }

    const validSections = ['drivers', 'vehicles', 'routes', 'customFields'];
    if (!validSections.includes(section)) {
      return res.status(400).json({
        success: false,
        message: 'Sección no válida'
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

    // Actualizar la sección específica
          //@ts-ignore

    config[section as keyof typeof config] = data;
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: config
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar configuración',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default updateConfig;