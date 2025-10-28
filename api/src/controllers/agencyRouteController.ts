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
      returnDropoffLocation, // For Round Trip
      routeType = 'single', 
      passengerCount = 1,
      waitingTimeHours = 0, // Mantener por compatibilidad
      waitingTime = 0 // Nuevo: en minutos
    } = req.body;

    // Convertir waitingTime de minutos a horas si se proporciona
    // Priorizar waitingTime (en minutos) sobre waitingTimeHours
    const waitingTimeInHours = waitingTime > 0 ? waitingTime / 60 : waitingTimeHours;

    if (!pickupLocation || !dropoffLocation) {
      return res.status(400).json({
        success: false,
        message: 'Both pickup and dropoff locations are required'
      });
    }

    // Note: returnDropoffLocation is optional for Round Trip
    // If not provided, only calculate the first route

    // Find first route (pickup -> dropoff)
    const firstRoute = await AgencyRoute.findByLocations(
      pickupLocation,
      dropoffLocation,
      true
    );

    if (!firstRoute) {
      return res.status(404).json({
        success: false,
        message: 'First route not found',
        payload: {
          found: false,
          price: null
        }
      });
    }

    let totalPrice = 0;
    let totalBreakdown = null;
    let routes = [firstRoute];

    // For Round Trip, sum the roundtrip prices of both routes
    if (routeType === 'roundtrip') {
      // If returnDropoffLocation is not provided, only calculate first route
      if (!returnDropoffLocation) {
        // Calculate price for first route only using roundtrip pricing
        const firstRoutePrice = firstRoute.calculatePrice(
          'roundtrip' as RouteType,
          passengerCount,
          waitingTimeInHours
        );

        if (firstRoutePrice === null) {
          return res.status(400).json({
            success: false,
            message: 'Could not calculate roundtrip price for first route. Check passenger count and roundtrip pricing configuration.',
            payload: {
              found: true,
              price: null
            }
          });
        }

        totalPrice = firstRoutePrice;
        totalBreakdown = firstRoute.getPriceBreakdown(
          'roundtrip' as RouteType,
          passengerCount,
          waitingTimeInHours
        );
      } else {
        // Both routes provided - calculate full round trip
        // Calculate price for first route using roundtrip pricing
        const firstRoutePrice = firstRoute.calculatePrice(
          'roundtrip' as RouteType,
          passengerCount,
          waitingTimeInHours / 2 // Split waiting time between routes
        );

        if (firstRoutePrice === null) {
          return res.status(400).json({
            success: false,
            message: 'Could not calculate roundtrip price for first route. Check passenger count and roundtrip pricing configuration.',
            payload: {
              found: true,
              price: null
            }
          });
        }

        totalPrice += firstRoutePrice;
        totalBreakdown = firstRoute.getPriceBreakdown(
          'roundtrip' as RouteType,
          passengerCount,
          waitingTimeInHours / 2
        );

        // Find and calculate second route (dropoff -> returnDropoff)
        const secondRoute = await AgencyRoute.findByLocations(
          dropoffLocation,
          returnDropoffLocation,
          true
        );

        if (!secondRoute) {
          return res.status(404).json({
            success: false,
            message: 'Return route not found',
            payload: {
              found: true,
              firstRoutePrice,
              price: null
            }
          });
        }

        // Calculate price for second route using roundtrip pricing
        const secondRoutePrice = secondRoute.calculatePrice(
          'roundtrip' as RouteType,
          passengerCount,
          waitingTimeInHours / 2 // Split waiting time between routes
        );

        if (secondRoutePrice === null) {
          return res.status(400).json({
            success: false,
            message: 'Could not calculate roundtrip price for return route. Check passenger count and roundtrip pricing configuration.',
            payload: {
              found: true,
              firstRoutePrice,
              price: null
            }
          });
        }

        totalPrice += secondRoutePrice;
        routes.push(secondRoute);

        // Combine breakdowns
        const secondBreakdown = secondRoute.getPriceBreakdown(
          'roundtrip' as RouteType,
          passengerCount,
          waitingTimeInHours / 2
        );

        if (totalBreakdown && secondBreakdown) {
          totalBreakdown = {
            basePrice: totalBreakdown.basePrice + secondBreakdown.basePrice,
            waitingTime: totalBreakdown.waitingTime + secondBreakdown.waitingTime,
            extraPassengers: totalBreakdown.extraPassengers + secondBreakdown.extraPassengers,
            total: totalBreakdown.total + secondBreakdown.total
          };
        }
      }
    } else {
      // For other route types (single, internal, etc.), calculate normally
      const routePrice = firstRoute.calculatePrice(
        routeType as RouteType,
        passengerCount,
        waitingTimeInHours
      );

      if (routePrice === null) {
        return res.status(400).json({
          success: false,
          message: 'Could not calculate price for this route type. Check passenger count.',
          payload: {
            found: true,
            price: null
          }
        });
      }

      totalPrice = routePrice;
      totalBreakdown = firstRoute.getPriceBreakdown(
        routeType as RouteType,
        passengerCount,
        waitingTimeInHours
      );
    }

    return res.status(200).json({
      success: true,
      payload: {
        found: true,
        price: totalPrice,
        breakdown: totalBreakdown,
        routes: routes.map(route => ({
          id: route._id,
          name: route.name,
          pickupLocation: route.pickupLocation || route.pickupSiteType,
          dropoffLocation: route.dropoffLocation || route.dropoffSiteType,
          currency: route.currency
        })),
        calculation: {
          routeType,
          passengerCount,
          waitingTimeHours: waitingTimeInHours,
          waitingTimeMinutes: waitingTime,
          isRoundTrip: routeType === 'roundtrip'
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
    console.log('🔧 [BACKEND] createRoute - Request body:', req.body);
    
    const {
      pickupLocation,
      dropoffLocation,
      pickupSiteType,
      dropoffSiteType,
      pricing,
      currency = 'USD',
      waitingTimeRate = 10,
      extraPassengerRate = 20,
      description,
      notes,
      distance,
      estimatedDuration
    } = req.body;

    // Validaciones - aceptar tanto site types como locations para compatibilidad
    const pickupValue = pickupSiteType || pickupLocation;
    const dropoffValue = dropoffSiteType || dropoffLocation;
    
    console.log('🔧 [BACKEND] createRoute - Values:', { pickupValue, dropoffValue, pickupSiteType, dropoffSiteType });
    
    if (!pickupValue || !dropoffValue) {
      console.log('❌ [BACKEND] createRoute - Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Pickup and dropoff locations (or site types) are required'
      });
    }

    if (!pricing || pricing.length === 0) {
      console.log('❌ [BACKEND] createRoute - No pricing configuration');
      return res.status(400).json({
        success: false,
        message: 'At least one pricing configuration is required'
      });
    }

    // Verificar que las ubicaciones o site types existen en el catálogo
    let pickupLocationCatalog = null;
    let dropoffLocationCatalog = null;
    
    if (pickupSiteType) {
      pickupLocationCatalog = await AgencyCatalog.findActiveByName('site_type', pickupSiteType);
    } else {
      pickupLocationCatalog = await AgencyCatalog.findActiveByName('location', pickupLocation);
    }
    
    if (dropoffSiteType) {
      dropoffLocationCatalog = await AgencyCatalog.findActiveByName('site_type', dropoffSiteType);
    } else {
      dropoffLocationCatalog = await AgencyCatalog.findActiveByName('location', dropoffLocation);
    }

    if (!pickupLocationCatalog) {
      console.log(`❌ [BACKEND] createRoute - Pickup ${pickupSiteType ? 'site type' : 'location'} "${pickupValue}" not found in catalog`);
      return res.status(400).json({
        success: false,
        message: `Pickup ${pickupSiteType ? 'site type' : 'location'} "${pickupValue}" not found in catalog`
      });
    }

    if (!dropoffLocationCatalog) {
      console.log(`❌ [BACKEND] createRoute - Dropoff ${dropoffSiteType ? 'site type' : 'location'} "${dropoffValue}" not found in catalog`);
      return res.status(400).json({
        success: false,
        message: `Dropoff ${dropoffSiteType ? 'site type' : 'location'} "${dropoffValue}" not found in catalog`
      });
    }

    // Verificar que no exista una ruta con estas ubicaciones/site types
    const existingRoute = await AgencyRoute.findByLocations(pickupValue, dropoffValue, false);
    if (existingRoute) {
      return res.status(400).json({
        success: false,
        message: 'A route with these locations/site types already exists'
      });
    }

    // Generar el nombre de la ruta
    const routeName = `${pickupValue.toUpperCase()} / ${dropoffValue.toUpperCase()}`;

    // Crear la ruta
    const route = new AgencyRoute({
      name: routeName,
      pickupLocation: pickupValue,
      dropoffLocation: dropoffValue,
      pickupSiteType: pickupSiteType || undefined,
      dropoffSiteType: dropoffSiteType || undefined,
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
    console.log('✅ [BACKEND] createRoute - Route saved successfully:', route._id);

    return res.status(201).json({
      success: true,
      message: 'Route created successfully',
      payload: {
        route
      }
    });
  } catch (error) {
    console.error('❌ [BACKEND] createRoute - Error:', error);
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

    // Contar rutas con pricing de internal
    const routesWithInternal = await AgencyRoute.countDocuments({
      'pricing.routeType': 'internal',
      isActive: true
    });

    // Contar rutas con pricing de bags_claim
    const routesWithBagsClaim = await AgencyRoute.countDocuments({
      'pricing.routeType': 'bags_claim',
      isActive: true
    });

    // Contar rutas con pricing de documentation
    const routesWithDocumentation = await AgencyRoute.countDocuments({
      'pricing.routeType': 'documentation',
      isActive: true
    });

    // Contar rutas con pricing de no_show
    const routesWithNoShow = await AgencyRoute.countDocuments({
      'pricing.routeType': 'no_show',
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
          routesWithSingle,
          routesWithInternal,
          routesWithBagsClaim,
          routesWithDocumentation,
          routesWithNoShow
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

