import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssRouteSchema from "../../database/schemas/ptyssRouteSchema";
import { response } from "../../utils";

const PTYSSRoute = mongoose.model('PTYSSRoute', ptyssRouteSchema);

const createPTYSSRoute = async (req: Request, res: Response) => {
  try {
    console.log('🔧 [BACKEND] createPTYSSRoute - Request body:', req.body);
    const { from, to, containerType, routeType, price, status, cliente, routeArea } = req.body;

    if (!from || !to || !containerType || !routeType || !price || !status || !cliente || !routeArea) {
      console.log('❌ [BACKEND] createPTYSSRoute - Campos faltantes');
      return response(res, 400, { message: 'Todos los campos son requeridos (from, to, containerType, routeType, price, status, cliente, routeArea)' });
    }

    // Generar automáticamente el nombre de la ruta
    const name = `${from}/${to}`;
    console.log('🔧 [BACKEND] createPTYSSRoute - Nombre generado:', name);

    // Verificar si ya existe una ruta con la misma combinación completa (según el índice único)
    console.log('🔧 [BACKEND] createPTYSSRoute - Verificando duplicados...');
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
      console.log('❌ [BACKEND] createPTYSSRoute - Ruta duplicada encontrada:', existingRoute._id);
      return response(res, 400, { 
        message: `Ya existe una ruta con estos parámetros: "${name}" (${containerType}, ${routeType}, ${status}, ${cliente}, ${routeArea})` 
      });
    }

    console.log('🔧 [BACKEND] createPTYSSRoute - Creando nueva ruta...');
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
    console.log('✅ [BACKEND] createPTYSSRoute - Ruta guardada en DB exitosamente!');
    console.log('✅ [BACKEND] createPTYSSRoute - ID:', newRoute._id);
    console.log('✅ [BACKEND] createPTYSSRoute - Datos completos:', JSON.stringify(newRoute.toObject(), null, 2));

    return response(res, 201, { 
      message: 'Ruta de PTYSS creada exitosamente',
      data: newRoute
    });
  } catch (error) {
    console.error('❌ [BACKEND] Error creando ruta de PTYSS:', error);
    console.error('❌ [BACKEND] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return response(res, 500, { 
      message: 'Error interno del servidor al crear ruta de PTYSS',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default createPTYSSRoute; 