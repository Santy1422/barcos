import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssLocalRouteSchema from "../../database/schemas/ptyssLocalRouteSchema";
import clientsSchema from "../../database/schemas/clientsSchema";
import { response } from "../../utils";

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);
const Client = mongoose.model('clients', clientsSchema);

const associateClientToRouteSet = async (req: Request, res: Response) => {
  try {
    const { clientName, realClientId } = req.body;

    if (!clientName || !realClientId) {
      return response(res, 400, { 
        message: 'Nombre del esquema de rutas y ID del cliente real son requeridos' 
      });
    }

    // Validar que el nombre del esquema sea válido
    if (!clientName.trim() || clientName.trim().length < 3) {
      return response(res, 400, { 
        message: 'El nombre del esquema debe tener al menos 3 caracteres' 
      });
    }

    // Validar que el ID del cliente real sea válido
    if (!mongoose.Types.ObjectId.isValid(realClientId)) {
      return response(res, 400, { message: 'ID de cliente real inválido' });
    }

    // Verificar que el cliente real existe
    const realClient = await Client.findById(realClientId);
    if (!realClient) {
      return response(res, 404, { message: 'Cliente real no encontrado' });
    }

    // Verificar que el esquema de rutas existe
    const existingRoutes = await PTYSSLocalRoute.find({ clientName });
    if (existingRoutes.length === 0) {
      return response(res, 404, { 
        message: `No se encontraron rutas para el esquema "${clientName}"` 
      });
    }

    // Verificar si el esquema de rutas ya está asociado a otro cliente
    const alreadyAssociated = existingRoutes.some(route => 
      route.realClientId && route.realClientId.toString() !== realClientId
    );
    if (alreadyAssociated) {
      return response(res, 400, { 
        message: `El esquema "${clientName}" ya está asociado a otro cliente` 
      });
    }

    // Verificar si el cliente real ya está asociado a otro esquema de rutas
    const clientAlreadyAssociated = await PTYSSLocalRoute.findOne({ 
      realClientId, 
      clientName: { $ne: clientName } 
    });
    if (clientAlreadyAssociated) {
      return response(res, 400, { 
        message: `El cliente real ya está asociado al esquema "${clientAlreadyAssociated.clientName}"` 
      });
    }

    // Asociar todas las rutas del esquema al cliente real
    const updateResult = await PTYSSLocalRoute.updateMany(
      { clientName },
      { $set: { realClientId } }
    );

    console.log(`Asociación completada: ${updateResult.modifiedCount} rutas actualizadas`);

    // Obtener las rutas actualizadas con información del cliente
    const updatedRoutes = await PTYSSLocalRoute.find({ clientName })
      .populate('realClientId', 'type fullName companyName sapCode email phone isActive');

    return response(res, 200, { 
      message: `Esquema "${clientName}" asociado exitosamente al cliente ${realClient.type === 'natural' ? realClient.fullName : realClient.companyName}`,
      data: {
        clientName,
        realClient: {
          _id: realClient._id,
          type: realClient.type,
          name: realClient.type === 'natural' ? realClient.fullName : realClient.companyName,
          sapCode: realClient.sapCode,
          email: realClient.email
        },
        updatedRoutes: updateResult.modifiedCount,
        routes: updatedRoutes
      }
    });
  } catch (error) {
    console.error('Error asociando cliente a esquema de rutas:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al asociar cliente a esquema de rutas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default associateClientToRouteSet; 