import { Request, Response } from "express";
import mongoose from "mongoose";
import configSchema from "../../database/schemas/configSchema";

const Config = mongoose.model('Config', configSchema);

const getConfig = async (req: Request, res: Response) => {
  try {
    const { section } = req.query;
          //@ts-ignore

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    let config = await Config.findOne({ userId })
      .populate('userId', 'name email');

    if (!config) {
      // Crear configuración vacía si no existe
      config = new Config({
        userId,
        drivers: [],
        vehicles: [],
        routes: [],
        customFields: []
      });
      await config.save();
    }

    // Filtrar por sección si se especifica
    if (section) {
      //@ts-ignore
      const sectionData = {
              //@ts-ignore

        [section]: config[section as keyof typeof config] || []
      };
      
      res.status(200).json({
        success: true,
        data: sectionData
      });
    } else {
      res.status(200).json({
        success: true,
        data: {
          drivers: config.drivers,
          vehicles: config.vehicles,
          routes: config.routes,
          customFields: config.customFields
        }
      });
    }
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener configuración',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default getConfig;