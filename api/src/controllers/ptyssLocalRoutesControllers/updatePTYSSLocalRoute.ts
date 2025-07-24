import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssLocalRouteSchema from "../../database/schemas/ptyssLocalRouteSchema";
import { response } from "../../utils";

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);

const updatePTYSSLocalRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { clientName, from, to, price } = req.body;

    console.log('Actualizando ruta local de PTYSS:', { id, updates: req.body });

    // Validar que el cliente esté en la lista permitida
    const validClients = ['cliente 1', 'cliente 2', 'cliente 3', 'cliente 4', 'cliente 5'];
    if (clientName && !validClients.includes(clientName)) {
      return response(res, 400, { 
        message: `Cliente inválido. Debe ser uno de: ${validClients.join(', ')}` 
      });
    }

    // Verificar si ya existe otra ruta para este cliente con el mismo origen y destino
    if (clientName && from && to) {
      const existingRoute = await PTYSSLocalRoute.findOne({ 
        clientName, 
        from, 
        to,
        _id: { $ne: id } // Excluir la ruta actual
      });
      if (existingRoute) {
        return response(res, 400, { 
          message: `Ya existe una ruta para ${clientName} con origen "${from}" y destino "${to}"` 
        });
      }
    }

    const updated = await PTYSSLocalRoute.findByIdAndUpdate(
      id,
      { clientName, from, to, price },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return response(res, 404, { message: 'Ruta local de PTYSS no encontrada' });
    }

    console.log('Ruta local actualizada exitosamente:', updated);
    return response(res, 200, { 
      message: 'Ruta local de PTYSS actualizada',
      data: updated
    });
  } catch (error) {
    console.error('Error actualizando ruta local de PTYSS:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al actualizar ruta local de PTYSS',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default updatePTYSSLocalRoute; 