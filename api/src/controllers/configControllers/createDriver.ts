import { Request, Response } from "express";
import mongoose from "mongoose";
import configSchema from "../../database/schemas/configSchema";

const Config = mongoose.model('Config', configSchema);

const createDriver = async (req: Request, res: Response) => {
  try {
    const { name, license, contact } = req.body;
            //@ts-ignore

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!name || !license || !contact) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, licencia y contacto son requeridos'
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

    // Verificar si ya existe un conductor con la misma licencia
    const existingDriver = config.drivers.find(driver => driver.license === license);
    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un conductor con esta licencia'
      });
    }

    // Agregar nuevo conductor
    config.drivers.push({ name, license, contact });
    await config.save();

    res.status(201).json({
      success: true,
      message: 'Conductor creado exitosamente',
      data: config.drivers[config.drivers.length - 1]
    });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear conductor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default createDriver;