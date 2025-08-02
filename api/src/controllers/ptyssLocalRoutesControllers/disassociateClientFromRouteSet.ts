import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssLocalRouteSchema from "../../database/schemas/ptyssLocalRouteSchema";
import clientsSchema from "../../database/schemas/clientsSchema";
import { response } from "../../utils";

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);
const Client = mongoose.model('clients', clientsSchema);

const disassociateClientFromRouteSet = async (req: Request, res: Response) => {
  try {
    const { clientName } = req.body;

    if (!clientName) {
      return response(res, 400, { 
        message: 'Nombre del esquema de rutas es requerido' 
      });
    }

    // Validar que el nombre del esquema sea válido
    if (!clientName.trim() || clientName.trim().length < 3) {
      return response(res, 400, { 
        message: 'El nombre del esquema debe tener al menos 3 caracteres' 
      });
    }

    const trimmedName = clientName.trim();

    // Verificar que el esquema de rutas existe
    const existingRoutes = await PTYSSLocalRoute.find({ clientName: trimmedName });
    if (existingRoutes.length === 0) {
      return response(res, 404, { 
        message: `No se encontraron rutas para el esquema "${trimmedName}"` 
      });
    }

    // Verificar si el esquema está asociado a algún cliente
    const associatedRoute = existingRoutes.find(route => route.realClientId);
    if (!associatedRoute) {
      return response(res, 400, { 
        message: `El esquema "${trimmedName}" no está asociado a ningún cliente` 
      });
    }

    // Obtener información del cliente antes de desasociar
    const associatedRouteWithClient = await PTYSSLocalRoute.findOne({ 
      clientName: trimmedName, 
      realClientId: { $ne: null } 
    }).populate('realClientId', 'type fullName companyName sapCode email');

    // Type cast para manejar el objeto poblado correctamente
    const clientInfo = associatedRouteWithClient?.realClientId as any;

    // Desasociar todas las rutas del esquema (establecer realClientId como null)
    const updateResult = await PTYSSLocalRoute.updateMany(
      { clientName: trimmedName },
      { $unset: { realClientId: 1 } }
    );

    console.log(`Desasociación completada: ${updateResult.modifiedCount} rutas desasociadas de "${trimmedName}"`);

    // Obtener las rutas actualizadas
    const updatedRoutes = await PTYSSLocalRoute.find({ clientName: trimmedName });

    return response(res, 200, { 
      message: `Esquema "${trimmedName}" desasociado exitosamente del cliente ${
        clientInfo && typeof clientInfo === 'object' && clientInfo._id
          ? (clientInfo.type === 'natural' ? clientInfo.fullName : clientInfo.companyName)
          : 'desconocido'
      }`,
      data: {
        clientName: trimmedName,
        previousClient: clientInfo && typeof clientInfo === 'object' && clientInfo._id ? {
          _id: clientInfo._id,
          type: clientInfo.type,
          name: clientInfo.type === 'natural' ? clientInfo.fullName : clientInfo.companyName,
          sapCode: clientInfo.sapCode,
          email: clientInfo.email
        } : null,
        updatedRoutes: updateResult.modifiedCount,
        routes: updatedRoutes
      }
    });
  } catch (error) {
    console.error('Error desasociando cliente de esquema de rutas:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al desasociar cliente de esquema de rutas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default disassociateClientFromRouteSet;