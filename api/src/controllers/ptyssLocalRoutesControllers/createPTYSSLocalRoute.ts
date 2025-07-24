import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssLocalRouteSchema from "../../database/schemas/ptyssLocalRouteSchema";
import { response } from "../../utils";

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);

const createPTYSSLocalRoute = async (req: Request, res: Response) => {
  try {
    const { clientName, from, to, price } = req.body;

    if (!clientName || !from || !to || price === undefined) {
      return response(res, 400, { message: 'Todos los campos son requeridos' });
    }

    // Validar que el cliente esté en la lista permitida
    const validClients = ['cliente 1', 'cliente 2', 'cliente 3', 'cliente 4', 'cliente 5'];
    if (!validClients.includes(clientName)) {
      return response(res, 400, { 
        message: `Cliente inválido. Debe ser uno de: ${validClients.join(', ')}` 
      });
    }

    // Verificar si ya existe una ruta para este cliente con el mismo origen y destino
    const existingRoute = await PTYSSLocalRoute.findOne({ 
      clientName, 
      from, 
      to 
    });
    if (existingRoute) {
      return response(res, 400, { 
        message: `Ya existe una ruta para ${clientName} con origen "${from}" y destino "${to}"` 
      });
    }

    const newRoute = new PTYSSLocalRoute({ clientName, from, to, price });
    await newRoute.save();

    return response(res, 201, { 
      message: 'Ruta local de PTYSS creada exitosamente',
      data: newRoute
    });
  } catch (error) {
    console.error('Error creando ruta local de PTYSS:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al crear ruta local de PTYSS',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default createPTYSSLocalRoute; 