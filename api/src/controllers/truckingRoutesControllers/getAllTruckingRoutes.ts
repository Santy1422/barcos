import { Request, Response } from "express";
import mongoose from "mongoose";
import truckingRouteSchema from "../../database/schemas/truckingRouteSchema";
import { response } from "../../utils";

const TruckingRoute = mongoose.model('TruckingRoute', truckingRouteSchema);

const getAllTruckingRoutes = async (req: Request, res: Response) => {
  try {
    // Parámetros de paginación
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Parámetros de filtrado
    const search = req.query.search as string;
    const containerType = req.query.containerType as string;
    const routeType = req.query.routeType as string;
    const status = req.query.status as string;

    // Construir filtros
    const filters: any = {};
    
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { origin: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (containerType && containerType !== 'all') {
      filters.containerType = containerType;
    }
    
    if (routeType && routeType !== 'all') {
      filters.routeType = routeType;
    }
    
    if (status && status !== 'all') {
      filters.status = status;
    }

    // Obtener total de documentos para paginación
    const total = await TruckingRoute.countDocuments(filters);
    
    // Obtener rutas con paginación
    const routes = await TruckingRoute.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calcular información de paginación
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return response(res, 200, { 
      data: routes,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      }
    });
  } catch (error) {
    console.error('Error obteniendo rutas de trucking:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al obtener rutas de trucking',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default getAllTruckingRoutes; 