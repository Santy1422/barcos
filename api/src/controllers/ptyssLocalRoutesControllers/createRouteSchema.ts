import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssLocalRouteSchema from "../../database/schemas/ptyssLocalRouteSchema";
import { response } from "../../utils";

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);

const createRouteSchema = async (req: Request, res: Response) => {
  try {
    const { schemaName } = req.body;

    if (!schemaName) {
      return response(res, 400, { message: 'El nombre del esquema es requerido' });
    }

    // Validar que el nombre del esquema sea válido
    if (!schemaName.trim() || schemaName.trim().length < 3) {
      return response(res, 400, { 
        message: 'El nombre del esquema debe tener al menos 3 caracteres' 
      });
    }

    const trimmedName = schemaName.trim();

    // Verificar si ya existe un esquema con ese nombre
    const existingSchema = await PTYSSLocalRoute.findOne({ clientName: trimmedName });
    if (existingSchema) {
      return response(res, 400, { 
        message: `Ya existe un esquema de rutas con el nombre "${trimmedName}"` 
      });
    }

    // Verificar que no sea un nombre reservado del sistema
    const reservedNames = ['admin', 'system', 'root', 'api', 'config'];
    if (reservedNames.includes(trimmedName.toLowerCase())) {
      return response(res, 400, { 
        message: 'No se pueden usar nombres reservados del sistema' 
      });
    }

    // Crear una ruta placeholder para registrar el esquema
    // Esta ruta se puede eliminar cuando se agregue la primera ruta real
    const placeholderRoute = new PTYSSLocalRoute({
      clientName: trimmedName,
      from: '__PLACEHOLDER__',
      to: '__PLACEHOLDER__',
      price: 0
    });

    await placeholderRoute.save();

    console.log(`Esquema "${trimmedName}" creado con ruta placeholder:`, placeholderRoute._id);

    return response(res, 201, { 
      message: `Esquema de rutas "${trimmedName}" creado exitosamente`,
      data: {
        schemaName: trimmedName,
        routeCount: 0,
        isAssociated: false,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creando esquema de rutas:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al crear esquema de rutas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default createRouteSchema;