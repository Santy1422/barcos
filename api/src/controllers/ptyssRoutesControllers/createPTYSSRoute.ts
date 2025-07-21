import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssRouteSchema from "../../database/schemas/ptyssRouteSchema";
import { response } from "../../utils";

const PTYSSRoute = mongoose.model('PTYSSRoute', ptyssRouteSchema);

const createPTYSSRoute = async (req: Request, res: Response) => {
  try {
    const { from, to, containerType, routeType, price } = req.body;

    if (!from || !to || !containerType || !routeType || !price) {
      return response(res, 400, { message: 'Todos los campos son requeridos' });
    }

    // Generar automáticamente el nombre de la ruta
    const name = `${from}/${to}`;

    // Verificar si ya existe una ruta con la misma combinación de nombre + tipo de contenedor + tipo de ruta
    const existingRoute = await PTYSSRoute.findOne({ 
      name, 
      containerType, 
      routeType 
    });
    if (existingRoute) {
      return response(res, 400, { 
        message: `Ya existe una ruta con el nombre "${name}", tipo de contenedor "${containerType}" y tipo de ruta "${routeType}"` 
      });
    }

    const newRoute = new PTYSSRoute({ name, from, to, containerType, routeType, price });
    await newRoute.save();

    return response(res, 201, { 
      message: 'Ruta de PTYSS creada exitosamente',
      data: newRoute
    });
  } catch (error) {
    console.error('Error creando ruta de PTYSS:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al crear ruta de PTYSS',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default createPTYSSRoute; 