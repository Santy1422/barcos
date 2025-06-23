import { Request, Response } from "express";
import mongoose from "mongoose";
import configSchema from "../../database/schemas/configSchema";

const Config = mongoose.model('Config', configSchema);

const updateDriver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, license, contact } = req.body;
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

    // Verificar si la nueva licencia ya existe en otro conductor
    if (license) {
      const existingDriver = config.drivers.find((driver, index) => 
        driver.license === license && index !== driverIndex
      );
      if (existingDriver) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un conductor con esta licencia'
        });
      }
    }

    // Actualizar conductor
    if (name) config.drivers[driverIndex].name = name;
    if (license) config.drivers[driverIndex].license = license;
    if (contact) config.drivers[driverIndex].contact = contact;

    await config.save();

    res.status(200).json({
      success: true,
      message: 'Conductor actualizado exitosamente',
      data: config.drivers[driverIndex]
    });
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar conductor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default updateDriver;