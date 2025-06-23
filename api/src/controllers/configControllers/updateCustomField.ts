import { Request, Response } from "express";
import mongoose from "mongoose";
import configSchema from "../../database/schemas/configSchema";

const Config = mongoose.model('Config', configSchema);

const updateCustomField = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, type, options, module } = req.body;
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

    const validTypes = ['text', 'number', 'date', 'select'];
    const validModules = ['trucking', 'agency', 'shipchandler'];
    
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de campo no válido'
      });
    }

    if (module && !validModules.includes(module)) {
      return res.status(400).json({
        success: false,
        message: 'Módulo no válido'
      });
    }

    // Verificar si la nueva etiqueta y módulo ya existen en otro campo
    if (label || module) {
      const newLabel = label || config.customFields[fieldIndex].label;
      const newModule = module || config.customFields[fieldIndex].module;
      
      const existingField = config.customFields.find((field, index) => 
        field.label === newLabel && field.module === newModule && index !== fieldIndex
      );
      if (existingField) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un campo personalizado con esta etiqueta en el módulo'
        });
      }
    }

    // Actualizar campo personalizado
    if (label) config.customFields[fieldIndex].label = label;
    if (type) config.customFields[fieldIndex].type = type;
    if (module) config.customFields[fieldIndex].module = module;
    if (options !== undefined) config.customFields[fieldIndex].options = options;

    await config.save();

    res.status(200).json({
      success: true,
      message: 'Campo personalizado actualizado exitosamente',
      data: config.customFields[fieldIndex]
    });
  } catch (error) {
    console.error('Error updating custom field:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar campo personalizado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default updateCustomField;