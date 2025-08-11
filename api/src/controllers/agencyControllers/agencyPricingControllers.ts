import { Request, Response } from 'express';
import AgencyCatalog from '../../database/schemas/agencyCatalogSchema';
import { catchedAsync } from '../../utils/catchedAsync';

// Calcular precio automático para un servicio
export const calculateServicePrice = catchedAsync(async (req: Request, res: Response) => {
  const { 
    pickupLocation, 
    dropoffLocation, 
    serviceCode, 
    waitingTime = 0,
    passengerCount = 1 
  } = req.body;

  // Validar campos requeridos
  if (!pickupLocation || !dropoffLocation) {
    return res.status(400).json({ 
      success: false,
      error: 'pickupLocation and dropoffLocation are required' 
    });
  }

  try {
    // Buscar precio por ruta específica
    let routePrice = await AgencyCatalog.findOne({
      type: 'route_pricing',
      'metadata.fromLocation': pickupLocation,
      'metadata.toLocation': dropoffLocation,
      isActive: true
    });

    // Si no existe ruta específica, buscar precio por Taulia Code
    let basePrice = 0;
    let description = '';
    let routeFound = false;

    if (routePrice) {
      // Precio basado en ruta específica
      basePrice = routePrice.metadata.basePrice || 0;
      description = `${pickupLocation} → ${dropoffLocation}`;
      routeFound = true;
      
    } else if (serviceCode) {
      // Precio basado en Taulia Code
      const tauliaCode = await AgencyCatalog.findOne({
        type: 'taulia_code',
        code: serviceCode,
        isActive: true
      });
      
      if (tauliaCode) {
        basePrice = tauliaCode.metadata.price || 0;
        description = tauliaCode.metadata.description || tauliaCode.name;
      }
    }

    // Si no se encuentra precio, usar precio por defecto
    if (basePrice === 0) {
      basePrice = await getDefaultPriceByRoute(pickupLocation, dropoffLocation);
      description = `${pickupLocation} → ${dropoffLocation} (Default Rate)`;
    }

    // Calcular cargos adicionales
    const waitingTimeCharge = waitingTime * (routePrice?.metadata.waitingTimePrice || 10);
    const passengerSurcharge = Math.max(0, (passengerCount - 1) * (routePrice?.metadata.pricePerPerson || 20));
    const totalPrice = basePrice + waitingTimeCharge + passengerSurcharge;

    res.json({
      success: true,
      pricing: {
        basePrice: totalPrice,
        waitingTimeCharge,
        passengerSurcharge,
        totalPrice,
        description,
        routeFound,
        breakdown: {
          baseRate: basePrice,
          waitingTime: waitingTimeCharge,
          extraPassengers: passengerSurcharge
        }
      }
    });

  } catch (error) {
    console.error('Error calculating price:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error calculating service price' 
    });
  }
});

// Obtener precio por defecto basado en tipo de ubicaciones
const getDefaultPriceByRoute = async (fromLocation: string, toLocation: string): Promise<number> => {
  try {
    // Buscar tipos de ubicaciones
    const fromLoc = await AgencyCatalog.findOne({
      type: 'location',
      name: fromLocation.toUpperCase(),
      isActive: true
    });
    
    const toLoc = await AgencyCatalog.findOne({
      type: 'location', 
      name: toLocation.toUpperCase(),
      isActive: true
    });

    // Pricing por tipo de ubicación
    const defaultPrices: Record<string, number> = {
      'HOTEL-PORT': 120,
      'HOTEL-AIRPORT': 85,
      'PORT-HOTEL': 120,
      'AIRPORT-HOTEL': 85,
      'HOTEL-HOSPITAL': 60,
      'HOSPITAL-HOTEL': 60,
      'PORT-AIRPORT': 150,
      'AIRPORT-PORT': 150,
      'HOTEL-HOTEL': 150,
      'PORT-PORT': 180,
      'DEFAULT': 100
    };

    const fromType = fromLoc?.metadata?.siteType || 'OTHER';
    const toType = toLoc?.metadata?.siteType || 'OTHER';
    const routeKey = `${fromType}-${toType}`;

    return defaultPrices[routeKey] || defaultPrices['DEFAULT'];

  } catch (error) {
    console.error('Error getting default price:', error);
    return 100; // Precio por defecto
  }
};

// Crear/actualizar pricing para una ruta
export const createRoutePricing = catchedAsync(async (req: Request, res: Response) => {
  const {
    fromLocation,
    toLocation,
    basePrice,
    pricePerPerson = 20,
    waitingTimePrice = 10,
    tauliaCode,
    description
  } = req.body;

  // Validar campos requeridos
  if (!fromLocation || !toLocation || basePrice === undefined) {
    return res.status(400).json({
      success: false,
      error: 'fromLocation, toLocation, and basePrice are required'
    });
  }

  if (typeof basePrice !== 'number' || basePrice < 0) {
    return res.status(400).json({
      success: false,
      error: 'basePrice must be a non-negative number'
    });
  }

  try {
    // Verificar si ya existe pricing para esta ruta
    const existingRoute = await AgencyCatalog.findOne({
      type: 'route_pricing',
      'metadata.fromLocation': fromLocation.toUpperCase(),
      'metadata.toLocation': toLocation.toUpperCase()
    });

    if (existingRoute) {
      return res.status(409).json({
        success: false,
        error: 'Pricing already exists for this route. Use update endpoint.'
      });
    }

    // Crear nuevo pricing
    const routePricing = new AgencyCatalog({
      type: 'route_pricing',
      name: `${fromLocation.toUpperCase()} → ${toLocation.toUpperCase()}`,
      code: tauliaCode,
      description: description || `Transportation from ${fromLocation} to ${toLocation}`,
      metadata: {
        fromLocation: fromLocation.toUpperCase(),
        toLocation: toLocation.toUpperCase(),
        basePrice: Number(basePrice),
        pricePerPerson: Number(pricePerPerson),
        waitingTimePrice: Number(waitingTimePrice),
        currency: 'USD'
      },
      isActive: true
    });

    await routePricing.save();

    res.status(201).json({
      success: true,
      routePricing,
      message: 'Route pricing created successfully'
    });

  } catch (error) {
    console.error('Error creating route pricing:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error creating route pricing' 
    });
  }
});

// Actualizar pricing de una ruta
export const updateRoutePricing = catchedAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    basePrice,
    pricePerPerson,
    waitingTimePrice,
    tauliaCode,
    description,
    isActive
  } = req.body;

  try {
    const routePricing = await AgencyCatalog.findById(id);

    if (!routePricing || routePricing.type !== 'route_pricing') {
      return res.status(404).json({
        success: false,
        error: 'Route pricing not found'
      });
    }

    // Actualizar campos
    if (basePrice !== undefined) routePricing.metadata.basePrice = Number(basePrice);
    if (pricePerPerson !== undefined) routePricing.metadata.pricePerPerson = Number(pricePerPerson);
    if (waitingTimePrice !== undefined) routePricing.metadata.waitingTimePrice = Number(waitingTimePrice);
    if (tauliaCode !== undefined) routePricing.code = tauliaCode;
    if (description !== undefined) routePricing.description = description;
    if (isActive !== undefined) routePricing.isActive = Boolean(isActive);

    await routePricing.save();

    res.json({
      success: true,
      routePricing,
      message: 'Route pricing updated successfully'
    });

  } catch (error) {
    console.error('Error updating route pricing:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error updating route pricing' 
    });
  }
});

// Obtener todos los precios de rutas
export const getAllRoutePricing = catchedAsync(async (req: Request, res: Response) => {
  const { active = 'true', grouped = 'false' } = req.query;

  try {
    const query: any = { type: 'route_pricing' };
    if (active === 'true') {
      query.isActive = true;
    }

    const routePricing = await AgencyCatalog.find(query)
      .sort({ 'metadata.fromLocation': 1, 'metadata.toLocation': 1 });

    if (grouped === 'true') {
      // Agrupar por ubicación de origen
      const groupedPricing: Record<string, any[]> = {};
      
      routePricing.forEach(route => {
        const from = route.metadata.fromLocation;
        if (!groupedPricing[from]) {
          groupedPricing[from] = [];
        }
        groupedPricing[from].push({
          id: route._id,
          to: route.metadata.toLocation,
          basePrice: route.metadata.basePrice,
          pricePerPerson: route.metadata.pricePerPerson,
          waitingTimePrice: route.metadata.waitingTimePrice,
          tauliaCode: route.code,
          description: route.description,
          isActive: route.isActive
        });
      });

      res.json({
        success: true,
        routePricing: groupedPricing,
        totalRoutes: routePricing.length
      });
    } else {
      res.json({
        success: true,
        routePricing,
        totalRoutes: routePricing.length
      });
    }

  } catch (error) {
    console.error('Error fetching route pricing:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching route pricing' 
    });
  }
});

// Eliminar pricing de ruta
export const deleteRoutePricing = catchedAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const routePricing = await AgencyCatalog.findById(id);

    if (!routePricing || routePricing.type !== 'route_pricing') {
      return res.status(404).json({
        success: false,
        error: 'Route pricing not found'
      });
    }

    // Soft delete (deactivate)
    routePricing.isActive = false;
    await routePricing.save();

    res.json({
      success: true,
      message: 'Route pricing deactivated successfully'
    });

  } catch (error) {
    console.error('Error deleting route pricing:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error deleting route pricing' 
    });
  }
});

// Importar pricing desde el catálogo del PDF
export const seedRoutePricing = catchedAsync(async (req: Request, res: Response) => {
  const { force = false } = req.body;

  try {
    // Verificar si ya existen datos
    const existingCount = await AgencyCatalog.countDocuments({ type: 'route_pricing' });
    
    if (existingCount > 0 && !force) {
      return res.status(400).json({
        success: false,
        error: 'Route pricing data already exists. Use force=true to replace.'
      });
    }

    // Eliminar datos existentes si force=true
    if (force) {
      await AgencyCatalog.deleteMany({ type: 'route_pricing' });
    }

    // Datos del PDF - Precios base por ruta
    const routePricingData = [
      // HOTEL PTY routes
      { from: 'HOTEL PTY', to: 'PTY PORT', taulia: 'ECR000669', price: 120, desc: 'Crew Members' },
      { from: 'HOTEL PTY', to: 'PTY', taulia: 'CLA00001', price: 85, desc: 'Security guard / Seal check' },
      { from: 'HOTEL PTY', to: 'HOTEL COLON', taulia: 'ECR001253', price: 150, desc: 'Reefer Technicians' },
      { from: 'HOTEL PTY', to: 'COLON PORT', taulia: 'GEN000089', price: 200, desc: 'VIP Expense / Personal de MSC' },
      { from: 'HOTEL PTY', to: 'HOSPITAL PTY', taulia: 'ECR000669', price: 60, desc: 'Medical Transport' },
      { from: 'HOTEL PTY', to: 'HOSPITAL COLON', taulia: 'ECR000669', price: 180, desc: 'Medical Transport' },
      { from: 'HOTEL PTY', to: 'BOAT LANDING PTY', taulia: 'ECR000669', price: 90, desc: 'Boat Transfer' },
      { from: 'HOTEL PTY', to: 'COLON', taulia: 'ECR000669', price: 160, desc: 'City Transfer' },

      // PTY PORT routes
      { from: 'PTY PORT', to: 'HOTEL PTY', taulia: 'ECR000669', price: 120, desc: 'Crew Members' },
      { from: 'PTY PORT', to: 'PTY', taulia: 'ECR000669', price: 40, desc: 'Local Transfer' },
      { from: 'PTY PORT', to: 'HOTEL COLON', taulia: 'ECR000669', price: 170, desc: 'Inter-city Transfer' },
      { from: 'PTY PORT', to: 'COLON PORT', taulia: 'ECR000669', price: 180, desc: 'Port to Port' },

      // PTY routes
      { from: 'PTY', to: 'HOTEL PTY', taulia: 'ECR000669', price: 40, desc: 'City to Hotel' },
      { from: 'PTY', to: 'PTY PORT', taulia: 'ECR000669', price: 40, desc: 'City to Port' },
      { from: 'PTY', to: 'HOTEL COLON', taulia: 'ECR000669', price: 160, desc: 'Inter-city Transfer' },
      { from: 'PTY', to: 'COLON PORT', taulia: 'ECR000669', price: 170, desc: 'City to Port' },

      // HOTEL COLON routes  
      { from: 'HOTEL COLON', to: 'HOTEL PTY', taulia: 'ECR000669', price: 150, desc: 'Hotel Transfer' },
      { from: 'HOTEL COLON', to: 'PTY PORT', taulia: 'ECR000669', price: 170, desc: 'Hotel to Port' },
      { from: 'HOTEL COLON', to: 'PTY', taulia: 'ECR000669', price: 160, desc: 'Hotel to City' },
      { from: 'HOTEL COLON', to: 'COLON PORT', taulia: 'ECR000669', price: 60, desc: 'Local Transfer' },

      // COLON PORT routes
      { from: 'COLON PORT', to: 'HOTEL PTY', taulia: 'ECR000669', price: 200, desc: 'Port to Hotel' },
      { from: 'COLON PORT', to: 'PTY PORT', taulia: 'ECR000669', price: 180, desc: 'Port to Port' },
      { from: 'COLON PORT', to: 'PTY', taulia: 'ECR000669', price: 170, desc: 'Port to City' },
      { from: 'COLON PORT', to: 'HOTEL COLON', taulia: 'ECR000669', price: 60, desc: 'Port to Hotel' },

      // HOSPITAL routes
      { from: 'HOSPITAL PTY', to: 'HOTEL PTY', taulia: 'ECR000669', price: 60, desc: 'Medical Return' },
      { from: 'HOSPITAL PTY', to: 'PTY PORT', taulia: 'ECR000669', price: 80, desc: 'Medical to Port' },
      { from: 'HOSPITAL COLON', to: 'HOTEL COLON', taulia: 'ECR000669', price: 50, desc: 'Medical Return' },
      { from: 'HOSPITAL COLON', to: 'COLON PORT', taulia: 'ECR000669', price: 70, desc: 'Medical to Port' },

      // BOAT LANDING routes
      { from: 'BOAT LANDING PTY', to: 'HOTEL PTY', taulia: 'ECR000669', price: 90, desc: 'Boat to Hotel' },
      { from: 'BOAT LANDING PTY', to: 'PTY PORT', taulia: 'ECR000669', price: 100, desc: 'Boat to Port' },

      // COLON general routes
      { from: 'COLON', to: 'HOTEL PTY', taulia: 'ECR000669', price: 160, desc: 'City Transfer' },
      { from: 'COLON', to: 'PTY PORT', taulia: 'ECR000669', price: 170, desc: 'City to Port' },
      { from: 'COLON', to: 'PTY', taulia: 'ECR000669', price: 150, desc: 'Inter-city' }
    ];

    // Crear documentos de pricing
    const pricingDocs = routePricingData.map(route => ({
      type: 'route_pricing',
      name: `${route.from} → ${route.to}`,
      code: route.taulia,
      description: route.desc,
      metadata: {
        fromLocation: route.from,
        toLocation: route.to,
        basePrice: route.price,
        pricePerPerson: 20, // Precio por pasajero adicional
        waitingTimePrice: 10, // $10 por hora de espera
        currency: 'USD'
      },
      isActive: true
    }));

    // Insertar en batch
    await AgencyCatalog.insertMany(pricingDocs);

    res.json({
      success: true,
      message: `Successfully seeded ${pricingDocs.length} route pricing entries`,
      routesCreated: pricingDocs.length
    });

  } catch (error) {
    console.error('Error seeding route pricing:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error seeding route pricing data' 
    });
  }
});

// Obtener estadísticas de pricing
export const getPricingStats = catchedAsync(async (req: Request, res: Response) => {
  try {
    const totalRoutes = await AgencyCatalog.countDocuments({ 
      type: 'route_pricing', 
      isActive: true 
    });

    const avgPrice = await AgencyCatalog.aggregate([
      { $match: { type: 'route_pricing', isActive: true } },
      { $group: { _id: null, avgPrice: { $avg: '$metadata.basePrice' } } }
    ]);

    const priceRanges = await AgencyCatalog.aggregate([
      { $match: { type: 'route_pricing', isActive: true } },
      {
        $bucket: {
          groupBy: '$metadata.basePrice',
          boundaries: [0, 50, 100, 150, 200, 1000],
          default: '200+',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    const topRoutes = await AgencyCatalog.find({ 
      type: 'route_pricing', 
      isActive: true 
    })
    .sort({ 'metadata.basePrice': -1 })
    .limit(5)
    .select('name metadata.basePrice metadata.fromLocation metadata.toLocation');

    res.json({
      success: true,
      stats: {
        totalRoutes,
        averagePrice: avgPrice[0]?.avgPrice || 0,
        priceRanges,
        topRoutes
      }
    });

  } catch (error) {
    console.error('Error getting pricing stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching pricing statistics' 
    });
  }
});