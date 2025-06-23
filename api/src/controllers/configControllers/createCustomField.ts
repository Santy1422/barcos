import { Request, Response } from "express";
import mongoose from "mongoose";
import configSchema from "../../database/schemas/configSchema";

const Config = mongoose.model('Config', configSchema);

const createCustomField = async (req: Request, res: Response) => {
  try {
    const { label, type, options, module } = req.body;
    //@ts-ignore
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!label || !type || !module) {
      return res.status(400).json({
        success: false,
        message: 'Etiqueta, tipo y módulo son requeridos'
      });
    }

    const validTypes = ['text', 'number', 'date', 'select'];
    const validModules = ['trucking', 'agency', 'shipchandler'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de campo no válido'
      });
    }

    if (!validModules.includes(module)) {
      return res.status(400).json({
        success: false,
        message: 'Módulo no válido'
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

    // Verificar si ya existe un campo personalizado con la misma etiqueta y módulo
    const existingField = config.customFields.find(field => 
      field.label === label && field.module === module
    );
    if (existingField) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un campo personalizado con esta etiqueta en el módulo'
      });
    }

    // Agregar nuevo campo personalizado
    const newField = { label, type, module, options: options || [] };
    config.customFields.push(newField);
    await config.save();

    res.status(201).json({
      success: true,
      message: 'Campo personalizado creado exitosamente',
      data: config.customFields[config.customFields.length - 1]
    });
  } catch (error) {
    console.error('Error creating custom field:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear campo personalizado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default createCustomField;