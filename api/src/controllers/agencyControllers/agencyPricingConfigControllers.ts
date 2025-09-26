import { Request, Response } from 'express';
import AgencyPricingConfig from '../../database/schemas/agencyPricingConfigSchema';
import { handleError } from '../../utils/errorHandler';

/**
 * Obtener todas las configuraciones de precios
 */
export const getPricingConfigs = async (req: Request, res: Response) => {
  try {
    const { 
      active = 'true',
      page = 1, 
      limit = 10 
    } = req.query;

    const query: any = {};
    if (active === 'true') query.isActive = true;

    const configs = await AgencyPricingConfig.find(query)
      .sort({ isDefault: -1, createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await AgencyPricingConfig.countDocuments(query);

    res.status(200).json({
      success: true,
      data: configs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    handleError(res, error, 'Error fetching pricing configurations');
  }
};

/**
 * Obtener configuración activa/por defecto
 */
export const getActiveConfig = async (req: Request, res: Response) => {
  try {
    const config = await (AgencyPricingConfig as any).getActiveConfig();
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No active pricing configuration found'
      });
    }

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    handleError(res, error, 'Error fetching active configuration');
  }
};

/**
 * Obtener una configuración por ID
 */
export const getPricingConfigById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const config = await AgencyPricingConfig.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Pricing configuration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    handleError(res, error, 'Error fetching pricing configuration');
  }
};

/**
 * Crear nueva configuración de precios
 */
export const createPricingConfig = async (req: Request, res: Response) => {
  try {
    const configData = req.body;
    const userId = (req as any).user?._id;

    // Si es la configuración por defecto, desactivar las demás
    if (configData.isDefault && configData.isActive) {
      await AgencyPricingConfig.updateMany(
        { isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const config = new AgencyPricingConfig({
      ...configData,
      createdBy: userId,
      updatedBy: userId
    });

    await config.save();

    res.status(201).json({
      success: true,
      data: config,
      message: 'Pricing configuration created successfully'
    });
  } catch (error) {
    handleError(res, error, 'Error creating pricing configuration');
  }
};

/**
 * Actualizar configuración de precios
 */
export const updatePricingConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = (req as any).user?._id;

    // Si se está estableciendo como configuración por defecto
    if (updateData.isDefault && updateData.isActive) {
      await AgencyPricingConfig.updateMany(
        { _id: { $ne: id }, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const config = await AgencyPricingConfig.findByIdAndUpdate(
      id,
      {
        ...updateData,
        updatedBy: userId,
        $inc: { version: 1 }
      },
      { new: true, runValidators: true }
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Pricing configuration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: config,
      message: 'Pricing configuration updated successfully'
    });
  } catch (error) {
    handleError(res, error, 'Error updating pricing configuration');
  }
};

/**
 * Eliminar configuración de precios
 */
export const deletePricingConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const config = await AgencyPricingConfig.findById(id);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Pricing configuration not found'
      });
    }

    // No permitir eliminar configuración por defecto activa
    if (config.isDefault && config.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete active default configuration. Please set another configuration as default first.'
      });
    }

    await config.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Pricing configuration deleted successfully'
    });
  } catch (error) {
    handleError(res, error, 'Error deleting pricing configuration');
  }
};

/**
 * Clonar una configuración
 */
export const clonePricingConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    const userId = (req as any).user?._id;

    const originalConfig = await AgencyPricingConfig.findById(id);

    if (!originalConfig) {
      return res.status(404).json({
        success: false,
        message: 'Original pricing configuration not found'
      });
    }

    // Crear copia sin el _id
    const clonedData = originalConfig.toObject();
    delete clonedData._id;
    delete clonedData.createdAt;
    delete clonedData.updatedAt;

    const clonedConfig = new AgencyPricingConfig({
      ...clonedData,
      name: name || `${originalConfig.name} (Copy)`,
      code: code || `${originalConfig.code}_COPY_${Date.now()}`,
      isDefault: false,  // La copia nunca es por defecto inicialmente
      createdBy: userId,
      updatedBy: userId,
      version: 1
    });

    await clonedConfig.save();

    res.status(201).json({
      success: true,
      data: clonedConfig,
      message: 'Pricing configuration cloned successfully'
    });
  } catch (error) {
    handleError(res, error, 'Error cloning pricing configuration');
  }
};

/**
 * Calcular precio usando una configuración específica
 */
export const calculatePrice = async (req: Request, res: Response) => {
  try {
    const {
      configId,
      from,
      to,
      serviceDate,
      serviceTime,
      passengerCount = 1,
      waitingHours = 0,
      serviceType,
      sapCode,
      promoCode,
      clientId
    } = req.body;

    // Obtener configuración
    let config;
    if (configId) {
      config = await AgencyPricingConfig.findById(configId);
    } else {
      config = await (AgencyPricingConfig as any).getActiveConfig(serviceDate);
    }

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No pricing configuration found'
      });
    }

    // Buscar ruta fija primero
    const fixedRoute = config.fixedRoutes?.find(route => 
      (route.from === from.toUpperCase() && route.to === to.toUpperCase()) ||
      (route.from === to.toUpperCase() && route.to === from.toUpperCase())
    );

    if (fixedRoute) {
      // Si hay una ruta fija, usar ese precio
      let price = fixedRoute.price;
      
      // Agregar cargos adicionales
      if (waitingHours > 0) {
        price += waitingHours * (config.additionalCharges?.waitingHourRate || 10);
      }
      
      if (passengerCount > 1) {
        price += (passengerCount - 1) * (config.additionalCharges?.extraPassengerRate || 20);
      }

      return res.status(200).json({
        success: true,
        data: {
          price,
          source: 'fixed_route',
          breakdown: {
            basePrice: fixedRoute.price,
            waitingCharge: waitingHours * (config.additionalCharges?.waitingHourRate || 10),
            extraPassengers: (passengerCount - 1) * (config.additionalCharges?.extraPassengerRate || 20)
          }
        }
      });
    }

    // Calcular precio basado en distancia
    const distance = getDistanceFromMatrix(config.distanceMatrix, from, to);
    
    if (!distance) {
      return res.status(400).json({
        success: false,
        message: 'Route not found in distance matrix'
      });
    }

    // Encontrar tarifa por distancia
    const distanceRate = config.distanceRates?.find(rate => 
      distance >= rate.minKm && distance <= rate.maxKm
    );

    if (!distanceRate) {
      return res.status(400).json({
        success: false,
        message: 'No distance rate configured for this distance'
      });
    }

    // Calcular precio base
    let price = config.baseFee || 25;
    
    if (distanceRate.fixedPrice) {
      price = distanceRate.fixedPrice;
    } else {
      price += distance * distanceRate.ratePerKm;
    }

    // Aplicar ajustes por tipo de servicio
    let serviceAdjustment = 0;
    if (serviceType && config.serviceAdjustments) {
      const adjustment = config.serviceAdjustments[serviceType as keyof typeof config.serviceAdjustments];
      if (adjustment && typeof adjustment === 'object' && 'type' in adjustment) {
        if (adjustment.type === 'percentage') {
          serviceAdjustment = price * (adjustment.value / 100);
        } else {
          serviceAdjustment = adjustment.value;
        }
      }
    }
    
    price += serviceAdjustment;

    // Aplicar ajuste por código SAP
    if (sapCode && config.sapCodeAdjustments) {
      const sapAdjustment = config.sapCodeAdjustments.find(adj => adj.code === sapCode);
      if (sapAdjustment) {
        if (sapAdjustment.adjustmentType === 'multiplier') {
          price *= sapAdjustment.adjustmentValue;
        } else if (sapAdjustment.adjustmentType === 'percentage') {
          price += price * (sapAdjustment.adjustmentValue / 100);
        } else {
          price += sapAdjustment.adjustmentValue;
        }
      }
    }

    // Agregar cargos adicionales
    const waitingCharge = waitingHours * (config.additionalCharges?.waitingHourRate || 10);
    const extraPassengerCharge = Math.max(0, passengerCount - 1) * (config.additionalCharges?.extraPassengerRate || 20);
    
    price += waitingCharge + extraPassengerCharge;

    // Aplicar descuentos
    let discount = 0;
    
    // Descuento por cliente
    if (clientId && config.discounts?.clientDiscounts) {
      const clientDiscount = config.discounts.clientDiscounts.find(
        d => d.clientId.toString() === clientId
      );
      if (clientDiscount) {
        discount = Math.max(discount, price * (clientDiscount.discountPercentage / 100));
      }
    }

    // Descuento promocional
    if (promoCode && config.discounts?.promotionalDiscounts) {
      const now = new Date();
      const promoDiscount = config.discounts.promotionalDiscounts.find(
        d => d.code === promoCode.toUpperCase() &&
             d.validFrom <= now &&
             d.validTo >= now &&
             (!d.maxUses || d.currentUses! < d.maxUses)
      );
      if (promoDiscount) {
        discount = Math.max(discount, price * (promoDiscount.discountPercentage / 100));
      }
    }

    price -= discount;

    // Aplicar precio mínimo
    price = Math.max(price, config.minimumPrice || 35);

    // Aplicar reglas de redondeo
    if (config.roundingRules) {
      price = applyRounding(price, config.roundingRules);
    }

    res.status(200).json({
      success: true,
      data: {
        price,
        distance,
        source: 'calculated',
        configId: config._id,
        configName: config.name,
        breakdown: {
          baseFee: config.baseFee || 25,
          distanceCharge: distance * (distanceRate.ratePerKm || 0),
          serviceAdjustment,
          waitingCharge,
          extraPassengerCharge,
          discount,
          minimumPrice: config.minimumPrice || 35
        }
      }
    });

  } catch (error) {
    handleError(res, error, 'Error calculating price');
  }
};

/**
 * Importar configuración desde el seed original
 */
export const importFromSeed = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    // Configuración basada en el análisis de patrones
    const defaultConfig = {
      name: 'Configuración Estándar Panama',
      code: 'STANDARD_PTY',
      description: 'Configuración basada en análisis de patrones de precios existentes',
      
      minimumPrice: 35,
      baseFee: 25,
      
      distanceRates: [
        { minKm: 0, maxKm: 20, ratePerKm: 4.00 },
        { minKm: 21, maxKm: 50, ratePerKm: 2.50 },
        { minKm: 51, maxKm: 999, ratePerKm: 1.50 }
      ],
      
      serviceAdjustments: {
        airport: { type: 'percentage', value: 20 },
        medical: { type: 'percentage', value: 15 },
        vip: { type: 'percentage', value: 30 },
        security: { type: 'percentage', value: 25 },
        emergency: { type: 'percentage', value: 50 },
        weekend: { type: 'percentage', value: 15 },
        holiday: { type: 'percentage', value: 25 },
        nightTime: { type: 'percentage', value: 20 }
      },
      
      additionalCharges: {
        waitingHourRate: 10,
        extraPassengerRate: 20,
        luggageRate: 5,
        tollsIncluded: false,
        fuelSurcharge: 0
      },
      
      sapCodeAdjustments: [
        { code: 'ECR000669', name: 'Tarifa Estándar', adjustmentType: 'multiplier', adjustmentValue: 1.0, priority: 1 },
        { code: 'ECR001253', name: 'Reefer Technicians', adjustmentType: 'percentage', adjustmentValue: 10, priority: 2 },
        { code: 'GEN000089', name: 'VIP/MSC Personal', adjustmentType: 'percentage', adjustmentValue: 30, priority: 3 },
        { code: 'CLA00001', name: 'Security/Seal Check', adjustmentType: 'percentage', adjustmentValue: 25, priority: 4 }
      ],
      
      fixedRoutes: [
        { from: 'TOCUMEN AIRPORT', to: 'CRISTOBAL PORT', price: 85 },
        { from: 'CRISTOBAL PORT', to: 'HOTEL RADISSON COLON', price: 35 },
        { from: 'HOTEL PTY', to: 'PTY PORT', price: 120 },
        { from: 'HOTEL PTY', to: 'TOCUMEN AIRPORT', price: 85 },
        { from: 'HOTEL PTY', to: 'CRISTOBAL PORT', price: 200 }
      ],
      
      distanceMatrix: [
        { from: 'HOTEL PTY', to: 'PTY PORT', distance: 15 },
        { from: 'HOTEL PTY', to: 'TOCUMEN AIRPORT', distance: 25 },
        { from: 'HOTEL PTY', to: 'CRISTOBAL PORT', distance: 80 },
        { from: 'HOTEL PTY', to: 'HOTEL RADISSON COLON', distance: 75 },
        { from: 'HOTEL PTY', to: 'COLON PORT', distance: 78 },
        { from: 'PTY PORT', to: 'TOCUMEN AIRPORT', distance: 35 },
        { from: 'PTY PORT', to: 'CRISTOBAL PORT', distance: 70 },
        { from: 'TOCUMEN AIRPORT', to: 'CRISTOBAL PORT', distance: 95 },
        { from: 'CRISTOBAL PORT', to: 'HOTEL RADISSON COLON', distance: 10 },
        { from: 'COLON PORT', to: 'CRISTOBAL PORT', distance: 5 }
      ],
      
      locations: [
        { name: 'TOCUMEN AIRPORT', category: 'airport', zone: 'PTY' },
        { name: 'PTY PORT', category: 'port', zone: 'PTY' },
        { name: 'CRISTOBAL PORT', category: 'port', zone: 'COLON' },
        { name: 'COLON PORT', category: 'port', zone: 'COLON' },
        { name: 'HOTEL PTY', category: 'hotel', zone: 'PTY' },
        { name: 'HOTEL RADISSON COLON', category: 'hotel', zone: 'COLON' },
        { name: 'HOSPITAL PTY', category: 'hospital', zone: 'PTY' },
        { name: 'HOSPITAL COLON', category: 'hospital', zone: 'COLON' }
      ],
      
      timeBasedPricing: {
        nightHours: {
          from: '22:00',
          to: '06:00',
          surchargeType: 'percentage',
          surchargeValue: 20
        },
        peakHours: [
          {
            from: '07:00',
            to: '09:00',
            daysOfWeek: [1, 2, 3, 4, 5], // Lunes a Viernes
            surchargeType: 'percentage',
            surchargeValue: 15
          },
          {
            from: '17:00',
            to: '19:00',
            daysOfWeek: [1, 2, 3, 4, 5],
            surchargeType: 'percentage',
            surchargeValue: 15
          }
        ]
      },
      
      roundingRules: {
        method: 'nearest',
        precision: 0
      },
      
      isActive: true,
      isDefault: true,
      createdBy: userId,
      updatedBy: userId
    };

    // Verificar si ya existe una configuración con este código
    const existing = await AgencyPricingConfig.findOne({ code: 'STANDARD_PTY' });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Default configuration already exists. Use update instead.'
      });
    }

    // Crear la configuración
    const config = new AgencyPricingConfig(defaultConfig);
    await config.save();

    res.status(201).json({
      success: true,
      data: config,
      message: 'Default pricing configuration imported successfully'
    });

  } catch (error) {
    handleError(res, error, 'Error importing seed configuration');
  }
};

// Funciones auxiliares

function getDistanceFromMatrix(
  matrix: any[] | undefined,
  from: string,
  to: string
): number | null {
  if (!matrix) return null;
  
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();
  
  const route = matrix.find(r => 
    (r.from === fromUpper && r.to === toUpper) ||
    (r.from === toUpper && r.to === fromUpper)
  );
  
  return route ? route.distance : null;
}

function applyRounding(
  price: number,
  rules: { method: string; precision: number }
): number {
  const factor = Math.pow(10, rules.precision);
  
  switch (rules.method) {
    case 'up':
      return Math.ceil(price * factor) / factor;
    case 'down':
      return Math.floor(price * factor) / factor;
    case 'nearest':
      return Math.round(price * factor) / factor;
    default:
      return price;
  }
}