import { Request, Response } from "express";
import mongoose from "mongoose";
import configSchema from "../../database/schemas/configSchema";

const Config = mongoose.model('Config', configSchema);

const updateVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { plate, model, capacity } = req.body;
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

    // Verificar si la nueva placa ya existe en otro vehículo
    if (plate) {
      const existingVehicle = config.vehicles.find((vehicle, index) => 
        vehicle.plate === plate && index !== vehicleIndex
      );
      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un vehículo con esta placa'
        });
      }
    }

    // Actualizar vehículo
    if (plate) config.vehicles[vehicleIndex].plate = plate;
    if (model) config.vehicles[vehicleIndex].model = model;
    if (capacity) config.vehicles[vehicleIndex].capacity = capacity;

    await config.save();

    res.status(200).json({
      success: true,
      message: 'Vehículo actualizado exitosamente',
      data: config.vehicles[vehicleIndex]
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar vehículo',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default updateVehicle;