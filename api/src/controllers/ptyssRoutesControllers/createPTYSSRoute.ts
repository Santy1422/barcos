import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssRouteSchema from "../../database/schemas/ptyssRouteSchema";
import { response } from "../../utils";

const PTYSSRoute = mongoose.model('PTYSSRoute', ptyssRouteSchema);

const createPTYSSRoute = async (req: Request, res: Response) => {
  try {
    const { from, to, containerType, routeType, price, status, cliente, routeArea } = req.body;

    if (!from || !to || !containerType || !routeType || !price || !status || !cliente || !routeArea) {
      return response(res, 400, { message: 'Todos los campos son requeridos (from, to, containerType, routeType, price, status, cliente, routeArea)' });
    }

    // Generar automáticamente el nombre de la ruta
    const name = `${from}/${to}`;

    // Verificar si ya existe una ruta con la misma combinación completa (según el índice único)
    const existingRoute = await PTYSSRoute.findOne({ 
      name, 
      from, 
      to, 
      containerType, 
      routeType, 
      status, 
      cliente, 
      routeArea
    });
    if (existingRoute) {
      return response(res, 400, { 
        message: `Ya existe una ruta con estos parámetros: "${name}" (${containerType}, ${routeType}, ${status}, ${cliente}, ${routeArea})` 
      });
    }

    const newRoute = new PTYSSRoute({ 
      name, 
      from, 
      to, 
      containerType, 
      routeType, 
      price, 
      status, 
      cliente, 
      routeArea 
    });
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