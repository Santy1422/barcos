import { Request, Response } from 'express';
import ServiceSapCode from '../database/schemas/serviceSapCodeSchema';

// Get all SAP service codes
export const getAllServiceSapCodes = async (req: Request, res: Response) => {
  try {
    const { module } = req.query;

    const filter: any = { active: true };
    if (module) {
      filter.$or = [{ module }, { module: 'all' }];
    }

    const codes = await ServiceSapCode.find(filter).sort({ code: 1 });

    res.status(200).json({
      success: true,
      data: codes
    });
  } catch (error: any) {
    console.error('Error fetching SAP service codes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching SAP service codes',
      error: error.message
    });
  }
};

// Get single SAP service code by code
export const getServiceSapCodeByCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const sapCode = await ServiceSapCode.findOne({ code: code.toUpperCase() });

    if (!sapCode) {
      return res.status(404).json({
        success: false,
        message: 'SAP service code not found'
      });
    }

    res.status(200).json({
      success: true,
      data: sapCode
    });
  } catch (error: any) {
    console.error('Error fetching SAP service code:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching SAP service code',
      error: error.message
    });
  }
};

// Create new SAP service code
export const createServiceSapCode = async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      description,
      module,
      profitCenter,
      activity,
      pillar,
      buCountry,
      serviceCountry,
      clientType,
      baseUnitMeasure,
      incomeRebateCode
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'Code and name are required'
      });
    }

    // Check if code already exists
    const existing = await ServiceSapCode.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'SAP service code already exists'
      });
    }

    const newCode = new ServiceSapCode({
      code: code.toUpperCase(),
      name,
      description,
      module: module || 'all',
      profitCenter,
      activity,
      pillar,
      buCountry: buCountry || 'PA',
      serviceCountry: serviceCountry || 'PA',
      clientType,
      baseUnitMeasure: baseUnitMeasure || 'EA',
      incomeRebateCode: incomeRebateCode || 'I'
    });

    await newCode.save();

    res.status(201).json({
      success: true,
      message: 'SAP service code created successfully',
      data: newCode
    });
  } catch (error: any) {
    console.error('Error creating SAP service code:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating SAP service code',
      error: error.message
    });
  }
};

// Update SAP service code
export const updateServiceSapCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const updateData = req.body;

    // Don't allow changing the code
    delete updateData.code;

    const updated = await ServiceSapCode.findOneAndUpdate(
      { code: code.toUpperCase() },
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'SAP service code not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'SAP service code updated successfully',
      data: updated
    });
  } catch (error: any) {
    console.error('Error updating SAP service code:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating SAP service code',
      error: error.message
    });
  }
};

// Delete (deactivate) SAP service code
export const deleteServiceSapCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const updated = await ServiceSapCode.findOneAndUpdate(
      { code: code.toUpperCase() },
      { $set: { active: false } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'SAP service code not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'SAP service code deactivated successfully',
      data: updated
    });
  } catch (error: any) {
    console.error('Error deleting SAP service code:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting SAP service code',
      error: error.message
    });
  }
};

// Seed default SAP service codes for Agency
export const seedAgencySapCodes = async (req: Request, res: Response) => {
  try {
    const defaultCodes = [
      {
        code: 'CLG098',
        name: 'Agency Crew Service',
        description: 'Main service for crew member transportation',
        module: 'agency',
        profitCenter: 'PAPANC440',
        activity: 'CLG',
        pillar: 'LOGS',
        buCountry: 'PA',
        serviceCountry: 'PA',
        clientType: 'MSCGVA',
        baseUnitMeasure: 'EA',
        incomeRebateCode: 'I'
      },
      {
        code: 'TRK137',
        name: 'Waiting Time Service',
        description: 'Additional charge for waiting time',
        module: 'agency',
        profitCenter: 'PAPANC430',
        activity: 'TRK',
        pillar: 'TRSP',
        buCountry: 'PA',
        serviceCountry: 'PA',
        clientType: 'MSCGVA',
        baseUnitMeasure: 'EA',
        incomeRebateCode: 'I'
      }
    ];

    const results = [];

    for (const codeData of defaultCodes) {
      const existing = await ServiceSapCode.findOne({ code: codeData.code });

      if (existing) {
        // Update existing
        const updated = await ServiceSapCode.findOneAndUpdate(
          { code: codeData.code },
          { $set: { ...codeData, active: true } },
          { new: true }
        );
        results.push({ code: codeData.code, action: 'updated', data: updated });
      } else {
        // Create new
        const newCode = new ServiceSapCode(codeData);
        await newCode.save();
        results.push({ code: codeData.code, action: 'created', data: newCode });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Agency SAP codes seeded successfully',
      data: results
    });
  } catch (error: any) {
    console.error('Error seeding SAP service codes:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding SAP service codes',
      error: error.message
    });
  }
};
