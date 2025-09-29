import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssRouteSchema from "../../database/schemas/ptyssRouteSchema";
import { response } from "../../utils";

const PTYSSRoute = mongoose.model('PTYSSRoute', ptyssRouteSchema);

const getAllPTYSSRoutes = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      containerType = '',
      routeType = '',
      status = '',
      cliente = '',
      routeArea = ''
    } = req.query;

    // Construir filtros
    const filters: any = {};

    // Filtro de búsqueda general
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { from: { $regex: search, $options: 'i' } },
        { to: { $regex: search, $options: 'i' } },
        { cliente: { $regex: search, $options: 'i' } }
      ];
    }

    // Filtros específicos
    if (containerType && containerType !== 'all') {
      filters.containerType = containerType;
    }

    if (routeType && routeType !== 'all') {
      filters.routeType = routeType;
    }

    if (status && status !== 'all') {
      filters.status = status;
    }

    if (cliente && cliente !== 'all') {
      filters.cliente = { $regex: cliente, $options: 'i' };
    }

    if (routeArea && routeArea !== 'all') {
      filters.routeArea = routeArea;
    }

    // Calcular paginación
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Obtener total de documentos
    const totalItems = await PTYSSRoute.countDocuments(filters);
    const totalPages = Math.ceil(totalItems / limitNum);

    // Obtener rutas con filtros y paginación
    const routes = await PTYSSRoute.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const pagination = {
      currentPage: pageNum,
      totalPages,
      totalItems,
      itemsPerPage: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    };

    return response(res, 200, { 
      data: routes,
      pagination
    });
  } catch (error) {
    console.error('Error obteniendo rutas de PTYSS:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al obtener rutas de PTYSS',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default getAllPTYSSRoutes; 