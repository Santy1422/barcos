import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssRouteSchema from "../../database/schemas/ptyssRouteSchema";
import { response } from "../../utils";

const PTYSSRoute = mongoose.model('PTYSSRoute', ptyssRouteSchema);

const updatePTYSSRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { from, to, containerType, routeType, price } = req.body;

    console.log('Actualizando ruta de PTYSS:', { id, updates: req.body });

    // Generar automáticamente el nombre de la ruta
    const name = `${from}/${to}`;

    // Verificar si ya existe otra ruta con la misma combinación de nombre + tipo de contenedor + tipo de ruta
    const existingRoute = await PTYSSRoute.findOne({ 
      name, 
      containerType, 
      routeType,
      _id: { $ne: id } // Excluir la ruta actual
    });
    if (existingRoute) {
      return response(res, 400, { 
        message: `Ya existe una ruta con el nombre "${name}", tipo de contenedor "${containerType}" y tipo de ruta "${routeType}"` 
      });
    }

    const updated = await PTYSSRoute.findByIdAndUpdate(
      id,
      { name, from, to, containerType, routeType, price },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return response(res, 404, { message: 'Ruta de PTYSS no encontrada' });
    }

    console.log('Ruta actualizada exitosamente:', updated);
    return response(res, 200, { 
      message: 'Ruta de PTYSS actualizada',
      data: updated
    });
  } catch (error) {
    console.error('Error actualizando ruta de PTYSS:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al actualizar ruta de PTYSS',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default updatePTYSSRoute; 