import { Request, Response } from 'express';
import AgencyRoute, { IAgencyRoute, RouteType } from '../database/schemas/agencyRouteSchema';
import AgencyCatalog from '../database/schemas/agencyCatalogSchema';

/**
 * @route   GET /api/agency/routes
 * @desc    Obtener todas las rutas con filtros opcionales
 * @access  Private
 */
export const getRoutes = async (req: Request, res: Response) => {
  try {
    const { 
      isActive, 
      pickupLocation, 
      dropoffLocation,
      search,
      page = '1',
      limit = '50'
    } = req.query;

    const query: any = {};

    // Filtros
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (pickupLocation) {
      query.pickupLocation = (pickupLocation as string).toUpperCase();
    }

    if (dropoffLocation) {
      query.dropoffLocation = (dropoffLocation as string).toUpperCase();
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { pickupLocation: { $regex: search, $options: 'i' } },
        { dropoffLocation: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const routes = await AgencyRoute.find(query)
      .populate('pickupLocationId')
      .populate('dropoffLocationId')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum);

    const totalRoutes = await AgencyRoute.countDocuments(query);

    return res.status(200).json({
      success: true,
      payload: {
        routes,
        totalRoutes,
        currentPage: pageNum,
        totalPages: Math.ceil(totalRoutes / limitNum),
        filters: {
          isActive,
          pickupLocation,
          dropoffLocation,
          search
        }
      }
    });
  } catch (error) {
    console.error('Error getting routes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching routes',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   GET /api/agency/routes/active
 * @desc    Obtener todas las rutas activas
 * @access  Private
 */
export const getActiveRoutes = async (req: Request, res: Response) => {
  try {
    const routes = await AgencyRoute.findAllActive();

    return res.status(200).json({
      success: true,
      payload: {
        routes
      }
    });
  } catch (error) {
    console.error('Error getting active routes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching active routes',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   GET /api/agency/routes/:id
 * @desc    Obtener una ruta por ID
 * @access  Private
 */
export const getRouteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const route = await AgencyRoute.findById(id)
      .populate('pickupLocationId')
      .populate('dropoffLocationId');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    return res.status(200).json({
      success: true,
      payload: {
        route
      }
    });
  } catch (error) {
    console.error('Error getting route:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching route',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   GET /api/agency/routes/lookup
 * @desc    Buscar ruta por ubicaciones
 * @access  Private
 */
export const getRouteByLocations = async (req: Request, res: Response) => {
  try {
    const { pickupLocation, dropoffLocation } = req.query;

    if (!pickupLocation || !dropoffLocation) {
      return res.status(400).json({
        success: false,
        message: 'Both pickup and dropoff locations are required'
      });
    }

    const route = await AgencyRoute.findByLocations(
      pickupLocation as string,
      dropoffLocation as string,
      true
    );

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
        payload: { found: false }
      });
    }

    return res.status(200).json({
      success: true,
      payload: {
        route,
        found: true
      }
    });
  } catch (error) {
    console.error('Error looking up route:', error);
    return res.status(500).json({
      success: false,
      message: 'Error looking up route',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   POST /api/agency/routes/calculate-price
 * @desc    Calcular precio para una ruta
 * @access  Private
 */
export const calculateRoutePrice = async (req: Request, res: Response) => {
  try {
    const { 
      pickupLocation, 
      dropoffLocation, 
      routeType = 'single', 
      passengerCount = 1,
      waitingTimeHours = 0
    } = req.body;

    if (!pickupLocation || !dropoffLocation) {
      return res.status(400).json({
        success: false,
        message: 'Both pickup and dropoff locations are required'
      });
    }

    const route = await AgencyRoute.findByLocations(
      pickupLocation,
      dropoffLocation,
      true
    );

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
        payload: {
          found: false,
          price: null
        }
      });
    }

    const price = route.calculatePrice(
      routeType as RouteType,
      passengerCount,
      waitingTimeHours
    );

    if (price === null) {
      return res.status(400).json({
        success: false,
        message: 'Could not calculate price. Check route type and passenger count.',
        payload: {
          found: true,
          price: null
        }
      });
    }

    const breakdown = route.getPriceBreakdown(
      routeType as RouteType,
      passengerCount,
      waitingTimeHours
    );

    return res.status(200).json({
      success: true,
      payload: {
        found: true,
        price,
        breakdown,
        route: {
          id: route._id,
          name: route.name,
          pickupLocation: route.pickupLocation,
          dropoffLocation: route.dropoffLocation,
          currency: route.currency
        },
        calculation: {
          routeType,
          passengerCount,
          waitingTimeHours
        }
      }
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    return res.status(500).json({
      success: false,
      message: 'Error calculating price',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   POST /api/agency/routes
 * @desc    Crear una nueva ruta
 * @access  Private
 */
export const createRoute = async (req: Request, res: Response) => {
  try {
    const {
      pickupLocation,
      dropoffLocation,
      pricing,
      currency = 'USD',
      waitingTimeRate = 10,
      extraPassengerRate = 20,
      description,
      notes,
      distance,
      estimatedDuration
    } = req.body;

    // Validaciones
    if (!pickupLocation || !dropoffLocation) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and dropoff locations are required'
      });
    }

    if (!pricing || pricing.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one pricing configuration is required'
      });
    }

    // Verificar que las ubicaciones existen en el catálogo
    const pickupLocationCatalog = await AgencyCatalog.findActiveByName('location', pickupLocation);
    const dropoffLocationCatalog = await AgencyCatalog.findActiveByName('location', dropoffLocation);

    if (!pickupLocationCatalog) {
      return res.status(400).json({
        success: false,
        message: `Pickup location "${pickupLocation}" not found in catalog`
      });
    }

    if (!dropoffLocationCatalog) {
      return res.status(400).json({
        success: false,
        message: `Dropoff location "${dropoffLocation}" not found in catalog`
      });
    }

    // Verificar que no exista una ruta con estas ubicaciones
    const existingRoute = await AgencyRoute.findByLocations(pickupLocation, dropoffLocation, false);
    if (existingRoute) {
      return res.status(400).json({
        success: false,
        message: 'A route with these locations already exists'
      });
    }

    // Generar el nombre de la ruta
    const routeName = `${pickupLocation.toUpperCase()} / ${dropoffLocation.toUpperCase()}`;

    // Crear la ruta
    const route = new AgencyRoute({
      name: routeName,
      pickupLocation,
      dropoffLocation,
      pickupLocationId: pickupLocationCatalog._id,
      dropoffLocationId: dropoffLocationCatalog._id,
      pricing,
      currency,
      waitingTimeRate,
      extraPassengerRate,
      description,
      notes,
      distance,
      estimatedDuration,
      isActive: true,
      createdBy: (req as any).user?.id
    });

    await route.save();

    return res.status(201).json({
      success: true,
      message: 'Route created successfully',
      payload: {
        route
      }
    });
  } catch (error) {
    console.error('Error creating route:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating route',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   PUT /api/agency/routes/:id
 * @desc    Actualizar una ruta
 * @access  Private
 */
export const updateRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const route = await AgencyRoute.findById(id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Si se cambian las ubicaciones, verificar que existan en el catálogo
    if (updateData.pickupLocation || updateData.dropoffLocation) {
      const pickupLocation = updateData.pickupLocation || route.pickupLocation;
      const dropoffLocation = updateData.dropoffLocation || route.dropoffLocation;

      // Validar que no sean iguales
      if (pickupLocation === dropoffLocation) {
        return res.status(400).json({
          success: false,
          message: 'Pickup and dropoff locations cannot be the same'
        });
      }

      // Verificar que las ubicaciones existan en el catálogo
      const pickupLocationCatalog = await AgencyCatalog.findActiveByName('location', pickupLocation);
      const dropoffLocationCatalog = await AgencyCatalog.findActiveByName('location', dropoffLocation);

      if (!pickupLocationCatalog || !dropoffLocationCatalog) {
        return res.status(400).json({
          success: false,
          message: 'One or both locations not found in catalog'
        });
      }

      // Actualizar ubicaciones y generar nuevo nombre
      route.pickupLocation = pickupLocation;
      route.dropoffLocation = dropoffLocation;
      route.pickupLocationId = pickupLocationCatalog._id;
      route.dropoffLocationId = dropoffLocationCatalog._id;
      route.name = `${pickupLocation.toUpperCase()} / ${dropoffLocation.toUpperCase()}`;
    }

    // Actualizar otros campos
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && 
          key !== 'pickupLocation' && 
          key !== 'dropoffLocation' &&
          key !== 'name' &&
          key !== 'pickupLocationId' &&
          key !== 'dropoffLocationId') {
        (route as any)[key] = updateData[key];
      }
    });

    route.updatedBy = (req as any).user?.id;
    await route.save();

    return res.status(200).json({
      success: true,
      message: 'Route updated successfully',
      payload: {
        route
      }
    });
  } catch (error) {
    console.error('Error updating route:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating route',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   PUT /api/agency/routes/:id/deactivate
 * @desc    Desactivar una ruta (soft delete)
 * @access  Private
 */
export const deactivateRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const route = await AgencyRoute.deactivate(id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Route deactivated successfully',
      payload: {
        route
      }
    });
  } catch (error) {
    console.error('Error deactivating route:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deactivating route',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   PUT /api/agency/routes/:id/reactivate
 * @desc    Reactivar una ruta
 * @access  Private
 */
export const reactivateRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const route = await AgencyRoute.reactivate(id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Route reactivated successfully',
      payload: {
        route
      }
    });
  } catch (error) {
    console.error('Error reactivating route:', error);
    return res.status(500).json({
      success: false,
      message: 'Error reactivating route',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   DELETE /api/agency/routes/:id
 * @desc    Eliminar permanentemente una ruta
 * @access  Private
 */
export const deleteRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const route = await AgencyRoute.findByIdAndDelete(id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Route deleted permanently',
      payload: {
        route
      }
    });
  } catch (error) {
    console.error('Error deleting route:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting route',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   GET /api/agency/routes/location/:location
 * @desc    Obtener todas las rutas que incluyen una ubicación específica
 * @access  Private
 */
export const getRoutesByLocation = async (req: Request, res: Response) => {
  try {
    const { location } = req.params;
    const { activeOnly = 'true' } = req.query;

    const routes = await AgencyRoute.findByLocation(
      location,
      activeOnly === 'true'
    );

    return res.status(200).json({
      success: true,
      payload: {
        routes,
        location,
        totalRoutes: routes.length
      }
    });
  } catch (error) {
    console.error('Error getting routes by location:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching routes by location',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   GET /api/agency/routes/statistics
 * @desc    Obtener estadísticas de rutas
 * @access  Private
 */
export const getRouteStatistics = async (req: Request, res: Response) => {
  try {
    const totalRoutes = await AgencyRoute.countDocuments();
    const activeRoutes = await AgencyRoute.countDocuments({ isActive: true });
    const inactiveRoutes = await AgencyRoute.countDocuments({ isActive: false });

    // Contar rutas con pricing de roundtrip
    const routesWithRoundtrip = await AgencyRoute.countDocuments({
      'pricing.routeType': 'roundtrip',
      isActive: true
    });

    // Contar rutas con pricing de single
    const routesWithSingle = await AgencyRoute.countDocuments({
      'pricing.routeType': 'single',
      isActive: true
    });

    return res.status(200).json({
      success: true,
      payload: {
        statistics: {
          totalRoutes,
          activeRoutes,
          inactiveRoutes,
          routesWithRoundtrip,
          routesWithSingle
        }
      }
    });
  } catch (error) {
    console.error('Error getting route statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching route statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

