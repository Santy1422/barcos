import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssLocalRouteSchema from "../../database/schemas/ptyssLocalRouteSchema";
import { response } from "../../utils";

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);

const deleteRouteSchema = async (req: Request, res: Response) => {
  try {
    const { schemaName } = req.params;

    if (!schemaName) {
      return response(res, 400, { message: 'El nombre del esquema es requerido' });
    }

    const trimmedName = schemaName.trim();

    // Verificar que el esquema existe
    const existingRoutes = await PTYSSLocalRoute.find({ clientName: trimmedName });
    if (existingRoutes.length === 0) {
      return response(res, 404, { 
        message: `No se encontró el esquema de rutas "${trimmedName}"` 
      });
    }

    // Verificar si el esquema está asociado a un cliente real
    const associatedRoute = existingRoutes.find(route => route.realClientId);
    if (associatedRoute) {
      return response(res, 400, { 
        message: `No se puede eliminar el esquema "${trimmedName}" porque está asociado a un cliente real. Desasocia el cliente primero.` 
      });
    }

    // Eliminar todas las rutas del esquema (incluyendo placeholders)
    const deleteResult = await PTYSSLocalRoute.deleteMany({ clientName: trimmedName });

    // Contar rutas reales (no placeholders) para el reporte
    const realRoutesDeleted = existingRoutes.filter(route => 
      route.from !== '__PLACEHOLDER__' && route.to !== '__PLACEHOLDER__'
    ).length;

    console.log(`Esquema eliminado: ${deleteResult.deletedCount} rutas eliminadas de "${trimmedName}" (${realRoutesDeleted} rutas reales)`);

    return response(res, 200, { 
      message: `Esquema de rutas "${trimmedName}" eliminado exitosamente`,
      data: {
        schemaName: trimmedName,
        deletedRoutes: realRoutesDeleted,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error eliminando esquema de rutas:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al eliminar esquema de rutas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default deleteRouteSchema; 