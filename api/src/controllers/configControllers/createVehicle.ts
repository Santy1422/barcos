import { Request, Response } from "express";
import mongoose from "mongoose";
import configSchema from "../../database/schemas/configSchema";

const Config = mongoose.model('Config', configSchema);

const createVehicle = async (req: Request, res: Response) => {
  try {
    const { plate, model, capacity } = req.body;
          //@ts-ignore

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!plate || !model || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Placa, modelo y capacidad son requeridos'
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

    // Verificar si ya existe un vehículo con la misma placa
    const existingVehicle = config.vehicles.find(vehicle => vehicle.plate === plate);
    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un vehículo con esta placa'
      });
    }

    // Agregar nuevo vehículo
    config.vehicles.push({ plate, model, capacity });
    await config.save();

    res.status(201).json({
      success: true,
      message: 'Vehículo creado exitosamente',
      data: config.vehicles[config.vehicles.length - 1]
    });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear vehículo',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default createVehicle;