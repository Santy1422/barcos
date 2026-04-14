import { Request, Response } from 'express';
import AgencyVehicleType from '../database/schemas/agencyVehicleTypeSchema';

export const getVehicleTypes = async (req: Request, res: Response) => {
  try {
    const { isActive, search } = req.query;
    const query: Record<string, unknown> = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search && typeof search === 'string' && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const vehicleTypes = await AgencyVehicleType.find(query).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      payload: { vehicleTypes },
    });
  } catch (error) {
    console.error('Error getting vehicle types:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching vehicle types',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getActiveVehicleTypes = async (_req: Request, res: Response) => {
  try {
    const vehicleTypes = await AgencyVehicleType.findAllActive();

    return res.status(200).json({
      success: true,
      payload: { vehicleTypes },
    });
  } catch (error) {
    console.error('Error getting active vehicle types:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching active vehicle types',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getVehicleTypeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vehicleType = await AgencyVehicleType.findById(id);

    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle type not found',
      });
    }

    return res.status(200).json({
      success: true,
      payload: { vehicleType },
    });
  } catch (error) {
    console.error('Error getting vehicle type:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching vehicle type',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const createVehicleType = async (req: Request, res: Response) => {
  try {
    const { name, description, isActive } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    const vehicleType = await AgencyVehicleType.create({
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() : undefined,
      isActive: isActive !== false,
    });

    return res.status(201).json({
      success: true,
      payload: { vehicleType },
    });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A vehicle type with this name already exists',
      });
    }
    console.error('Error creating vehicle type:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating vehicle type',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const updateVehicleType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const update: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty',
        });
      }
      update.name = name.trim();
    }
    if (description !== undefined) {
      update.description = typeof description === 'string' ? description.trim() : '';
    }
    if (isActive !== undefined) {
      update.isActive = Boolean(isActive);
    }

    const vehicleType = await AgencyVehicleType.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle type not found',
      });
    }

    return res.status(200).json({
      success: true,
      payload: { vehicleType },
    });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A vehicle type with this name already exists',
      });
    }
    console.error('Error updating vehicle type:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating vehicle type',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const deleteVehicleType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vehicleType = await AgencyVehicleType.findByIdAndDelete(id);

    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle type not found',
      });
    }

    return res.status(200).json({
      success: true,
      payload: { deletedId: id },
    });
  } catch (error) {
    console.error('Error deleting vehicle type:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting vehicle type',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
