import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssLocalRouteSchema from "../../database/schemas/ptyssLocalRouteSchema";
import { response } from "../../utils";

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);

const updatePTYSSLocalRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { clientName, realClientId, from, to, price } = req.body;

    console.log('Actualizando ruta local de PTYSS:', { id, updates: req.body });

    // Validar que el nombre del esquema sea válido si se proporciona
    if (clientName && (!clientName.trim() || clientName.trim().length < 3)) {
      return response(res, 400, { 
        message: 'El nombre del esquema debe tener al menos 3 caracteres' 
      });
    }

    // Validar realClientId si se proporciona
    if (realClientId && !mongoose.Types.ObjectId.isValid(realClientId)) {
      return response(res, 400, { message: 'ID de cliente real inválido' });
    }

    // Verificar si ya existe otra ruta para este esquema con el mismo origen y destino
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

    const updateData: any = {};
    if (clientName !== undefined) updateData.clientName = clientName;
    if (realClientId !== undefined) updateData.realClientId = realClientId;
    if (from !== undefined) updateData.from = from;
    if (to !== undefined) updateData.to = to;
    if (price !== undefined) updateData.price = price;

    const updated = await PTYSSLocalRoute.findByIdAndUpdate(
      id,
      updateData,
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