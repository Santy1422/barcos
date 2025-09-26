import AgencyCatalog from '../database/schemas/agencyCatalogSchema';
import AgencyPricingConfig from '../database/schemas/agencyPricingConfigSchema';

interface PricingFactors {
  distance: number;
  isAirport: boolean;
  isMedical: boolean;
  isVIP: boolean;
  isSecurity: boolean;
  waitingHours: number;
  extraPassengers: number;
  serviceCode?: string;
}

interface PriceBreakdown {
  baseRate: number;
  distanceCharge: number;
  serviceTypeAdjustment: number;
  waitingTimeCharge: number;
  extraPassengerCharge: number;
  subtotal: number;
  finalPrice: number;
}

// Matriz de distancias entre ubicaciones principales en Panamá (km)
const DISTANCE_MATRIX: Record<string, Record<string, number>> = {
  'HOTEL PTY': {
    'PTY PORT': 15,
    'TOCUMEN AIRPORT': 25,
    'CRISTOBAL PORT': 80,
    'HOTEL RADISSON COLON': 75,
    'COLON PORT': 78,
    'HOSPITAL PTY': 8,
    'HOSPITAL COLON': 75,
    'BOAT LANDING PTY': 12,
    'PTY': 5
  },
  'PTY PORT': {
    'HOTEL PTY': 15,
    'TOCUMEN AIRPORT': 35,
    'HOTEL RADISSON COLON': 65,
    'CRISTOBAL PORT': 70,
    'PTY': 10,
    'HOSPITAL PTY': 18
  },
  'TOCUMEN AIRPORT': {
    'CRISTOBAL PORT': 95,
    'HOTEL PTY': 25,
    'PTY PORT': 35,
    'HOTEL RADISSON COLON': 90,
    'COLON PORT': 93,
    'HOSPITAL PTY': 30,
    'HOSPITAL COLON': 92
  },
  'CRISTOBAL PORT': {
    'HOTEL RADISSON COLON': 10,
    'TOCUMEN AIRPORT': 95,
    'HOTEL PTY': 80,
    'PTY PORT': 70,
    'COLON PORT': 5,
    'HOSPITAL COLON': 12
  },
  'HOTEL RADISSON COLON': {
    'CRISTOBAL PORT': 10,
    'HOTEL PTY': 75,
    'PTY PORT': 65,
    'TOCUMEN AIRPORT': 90,
    'COLON PORT': 8,
    'HOSPITAL COLON': 5
  },
  'COLON PORT': {
    'HOTEL PTY': 78,
    'PTY PORT': 68,
    'HOTEL RADISSON COLON': 8,
    'CRISTOBAL PORT': 5,
    'TOCUMEN AIRPORT': 93
  },
  'HOSPITAL PTY': {
    'HOTEL PTY': 8,
    'PTY PORT': 18,
    'TOCUMEN AIRPORT': 30,
    'HOSPITAL COLON': 73
  },
  'HOSPITAL COLON': {
    'HOTEL RADISSON COLON': 5,
    'CRISTOBAL PORT': 12,
    'COLON PORT': 10,
    'HOTEL PTY': 75,
    'HOSPITAL PTY': 73
  }
};

// Configuración de precios
const PRICING_CONFIG = {
  MINIMUM_PRICE: 35,
  BASE_FEE: 25,
  
  // Tarifas por km según distancia
  RATE_PER_KM: {
    SHORT: { maxKm: 20, rate: 4.00 },    // 0-20 km
    MEDIUM: { maxKm: 50, rate: 2.50 },   // 21-50 km
    LONG: { maxKm: Infinity, rate: 1.50 } // >50 km
  },
  
  // Ajustes por tipo de servicio (multiplicadores)
  SERVICE_ADJUSTMENTS: {
    AIRPORT: 0.20,    // +20%
    MEDICAL: 0.15,    // +15%
    VIP: 0.30,        // +30%
    SECURITY: 0.25    // +25%
  },
  
  // Cargos adicionales
  WAITING_HOUR_RATE: 10,    // $10 por hora
  EXTRA_PASSENGER_RATE: 20  // $20 por pasajero adicional
};

// Códigos SAP especiales y sus ajustes
const SAP_CODE_ADJUSTMENTS: Record<string, number> = {
  'ECR000669': 1.0,    // Tarifa estándar
  'ECR001253': 1.1,    // +10% para Reefer Technicians
  'GEN000089': 1.3,    // +30% para VIP/MSC Personal
  'CLA00001': 1.25     // +25% para Security/Seal check
};

export class AgencyPricingService {
  /**
   * Calcula la distancia entre dos ubicaciones
   */
  private static getDistance(from: string, to: string): number {
    const fromUpper = from.toUpperCase().trim();
    const toUpper = to.toUpperCase().trim();
    
    // Buscar en la matriz de distancias
    if (DISTANCE_MATRIX[fromUpper]?.[toUpper]) {
      return DISTANCE_MATRIX[fromUpper][toUpper];
    }
    if (DISTANCE_MATRIX[toUpper]?.[fromUpper]) {
      return DISTANCE_MATRIX[toUpper][fromUpper];
    }
    
    // Si no se encuentra, estimar basado en similitud de nombres
    return this.estimateDistance(fromUpper, toUpper);
  }
  
  /**
   * Estima la distancia cuando no está en la matriz
   */
  private static estimateDistance(from: string, to: string): number {
    // Si ambas ubicaciones están en Colón
    if ((from.includes('COLON') || from.includes('CRISTOBAL')) && 
        (to.includes('COLON') || to.includes('CRISTOBAL'))) {
      return 10; // Distancia local en Colón
    }
    
    // Si ambas están en Ciudad de Panamá
    if ((from.includes('PTY') && !from.includes('AIRPORT')) && 
        (to.includes('PTY') && !to.includes('AIRPORT'))) {
      return 12; // Distancia local en PTY
    }
    
    // Si una es aeropuerto
    if (from.includes('AIRPORT') || to.includes('AIRPORT')) {
      if (from.includes('COLON') || to.includes('COLON')) {
        return 90; // Aeropuerto a Colón
      }
      return 30; // Aeropuerto a PTY promedio
    }
    
    // Si es entre PTY y Colón
    if ((from.includes('PTY') && (to.includes('COLON') || to.includes('CRISTOBAL'))) ||
        (to.includes('PTY') && (from.includes('COLON') || from.includes('CRISTOBAL')))) {
      return 75; // PTY a Colón promedio
    }
    
    // Distancia por defecto para rutas desconocidas
    return 25;
  }
  
  /**
   * Detecta el tipo de servicio basado en la ubicación
   */
  private static detectServiceType(from: string, to: string): Partial<PricingFactors> {
    const locations = `${from} ${to}`.toUpperCase();
    
    return {
      isAirport: locations.includes('AIRPORT') || locations.includes('TOCUMEN'),
      isMedical: locations.includes('HOSPITAL') || locations.includes('CLINIC'),
      isVIP: false, // Se debe especificar explícitamente
      isSecurity: false // Se debe especificar explícitamente
    };
  }
  
  /**
   * Calcula la tarifa por km según la distancia
   */
  private static getRatePerKm(distance: number): number {
    if (distance <= PRICING_CONFIG.RATE_PER_KM.SHORT.maxKm) {
      return PRICING_CONFIG.RATE_PER_KM.SHORT.rate;
    } else if (distance <= PRICING_CONFIG.RATE_PER_KM.MEDIUM.maxKm) {
      return PRICING_CONFIG.RATE_PER_KM.MEDIUM.rate;
    } else {
      return PRICING_CONFIG.RATE_PER_KM.LONG.rate;
    }
  }
  
  /**
   * Calcula el precio de un servicio de Agency
   */
  static calculatePrice(
    from: string,
    to: string,
    options: {
      serviceCode?: string;
      waitingHours?: number;
      passengerCount?: number;
      isVIP?: boolean;
      isSecurity?: boolean;
    } = {}
  ): { price: number; breakdown: PriceBreakdown; distance: number } {
    // Obtener distancia
    const distance = this.getDistance(from, to);
    
    // Detectar tipo de servicio automáticamente
    const serviceType = this.detectServiceType(from, to);
    
    // Crear factores de precio
    const factors: PricingFactors = {
      distance,
      isAirport: serviceType.isAirport || false,
      isMedical: serviceType.isMedical || false,
      isVIP: options.isVIP || false,
      isSecurity: options.isSecurity || false,
      waitingHours: options.waitingHours || 0,
      extraPassengers: Math.max(0, (options.passengerCount || 1) - 1),
      serviceCode: options.serviceCode
    };
    
    // Calcular componentes del precio
    const baseRate = PRICING_CONFIG.BASE_FEE;
    const ratePerKm = this.getRatePerKm(distance);
    const distanceCharge = distance * ratePerKm;
    
    // Calcular ajustes por tipo de servicio
    let serviceTypeAdjustment = 0;
    const basePrice = baseRate + distanceCharge;
    
    if (factors.isAirport) {
      serviceTypeAdjustment += basePrice * PRICING_CONFIG.SERVICE_ADJUSTMENTS.AIRPORT;
    }
    if (factors.isMedical) {
      serviceTypeAdjustment += basePrice * PRICING_CONFIG.SERVICE_ADJUSTMENTS.MEDICAL;
    }
    if (factors.isVIP) {
      serviceTypeAdjustment += basePrice * PRICING_CONFIG.SERVICE_ADJUSTMENTS.VIP;
    }
    if (factors.isSecurity) {
      serviceTypeAdjustment += basePrice * PRICING_CONFIG.SERVICE_ADJUSTMENTS.SECURITY;
    }
    
    // Cargos adicionales
    const waitingTimeCharge = factors.waitingHours * PRICING_CONFIG.WAITING_HOUR_RATE;
    const extraPassengerCharge = factors.extraPassengers * PRICING_CONFIG.EXTRA_PASSENGER_RATE;
    
    // Subtotal
    let subtotal = baseRate + distanceCharge + serviceTypeAdjustment + 
                   waitingTimeCharge + extraPassengerCharge;
    
    // Aplicar ajuste por código SAP si existe
    if (factors.serviceCode && SAP_CODE_ADJUSTMENTS[factors.serviceCode]) {
      subtotal *= SAP_CODE_ADJUSTMENTS[factors.serviceCode];
    }
    
    // Aplicar precio mínimo
    const finalPrice = Math.max(PRICING_CONFIG.MINIMUM_PRICE, Math.round(subtotal));
    
    const breakdown: PriceBreakdown = {
      baseRate,
      distanceCharge: Math.round(distanceCharge),
      serviceTypeAdjustment: Math.round(serviceTypeAdjustment),
      waitingTimeCharge,
      extraPassengerCharge,
      subtotal: Math.round(subtotal),
      finalPrice
    };
    
    return {
      price: finalPrice,
      breakdown,
      distance
    };
  }
  
  /**
   * Busca precio usando la configuración activa o calcula uno nuevo
   */
  static async getPriceWithConfig(
    from: string,
    to: string,
    options: {
      serviceCode?: string;
      waitingHours?: number;
      passengerCount?: number;
      serviceDate?: Date;
    } = {}
  ): Promise<{
    price: number;
    source: 'fixed_route' | 'calculated' | 'database';
    breakdown?: PriceBreakdown;
    distance?: number;
    routeCode?: string;
    configUsed?: string;
  }> {
    try {
      // Obtener configuración activa
      const config = await (AgencyPricingConfig as any).getActiveConfig(options.serviceDate);
      
      if (config) {
        // Buscar en rutas fijas de la configuración
        const fromUpper = from.toUpperCase().trim();
        const toUpper = to.toUpperCase().trim();
        
        const fixedRoute = config.fixedRoutes?.find(route =>
          (route.from === fromUpper && route.to === toUpper) ||
          (route.from === toUpper && route.to === fromUpper)
        );
        
        if (fixedRoute) {
          let price = fixedRoute.price;
          
          // Agregar cargos adicionales
          if (options.waitingHours) {
            price += options.waitingHours * (config.additionalCharges?.waitingHourRate || 10);
          }
          if (options.passengerCount && options.passengerCount > 1) {
            const extraPassengers = options.passengerCount - 1;
            price += extraPassengers * (config.additionalCharges?.extraPassengerRate || 20);
          }
          
          return {
            price,
            source: 'fixed_route',
            routeCode: fixedRoute.sapCode,
            distance: this.getDistanceFromConfig(config, from, to),
            configUsed: config.name
          };
        }
        
        // Si no hay ruta fija, calcular usando la configuración
        const distance = this.getDistanceFromConfig(config, from, to) || this.getDistance(from, to);
        const calculated = this.calculatePriceWithConfig(config, from, to, distance, options);
        
        return {
          price: calculated.price,
          source: 'calculated',
          breakdown: calculated.breakdown,
          distance,
          configUsed: config.name
        };
      }
      
      // Si no hay configuración, usar el método original
      return this.getPriceForRoute(from, to, options);
      
    } catch (error) {
      console.error('Error getting price with config:', error);
      
      // En caso de error, usar el método original
      return this.getPriceForRoute(from, to, options);
    }
  }
  
  /**
   * Obtiene la distancia desde la matriz de la configuración
   */
  private static getDistanceFromConfig(config: any, from: string, to: string): number | null {
    if (!config.distanceMatrix) return null;
    
    const fromUpper = from.toUpperCase().trim();
    const toUpper = to.toUpperCase().trim();
    
    const entry = config.distanceMatrix.find((e: any) =>
      (e.from === fromUpper && e.to === toUpper) ||
      (e.from === toUpper && e.to === fromUpper)
    );
    
    return entry ? entry.distance : null;
  }
  
  /**
   * Calcula el precio usando una configuración específica
   */
  private static calculatePriceWithConfig(
    config: any,
    from: string,
    to: string,
    distance: number,
    options: {
      serviceCode?: string;
      waitingHours?: number;
      passengerCount?: number;
    } = {}
  ): { price: number; breakdown: PriceBreakdown } {
    // Encontrar tarifa por distancia
    const distanceRate = config.distanceRates?.find((rate: any) =>
      distance >= rate.minKm && distance <= rate.maxKm
    ) || { ratePerKm: 1.5 }; // Tarifa por defecto si no se encuentra
    
    // Calcular precio base
    let baseRate = config.baseFee || 25;
    let distanceCharge = distanceRate.fixedPrice || (distance * distanceRate.ratePerKm);
    
    // Detectar tipo de servicio
    const serviceType = this.detectServiceType(from, to);
    let serviceTypeAdjustment = 0;
    
    if (config.serviceAdjustments) {
      const basePrice = baseRate + distanceCharge;
      
      if (serviceType.isAirport && config.serviceAdjustments.airport) {
        const adj = config.serviceAdjustments.airport;
        serviceTypeAdjustment += adj.type === 'percentage' 
          ? basePrice * (adj.value / 100)
          : adj.value;
      }
      
      if (serviceType.isMedical && config.serviceAdjustments.medical) {
        const adj = config.serviceAdjustments.medical;
        serviceTypeAdjustment += adj.type === 'percentage'
          ? basePrice * (adj.value / 100)
          : adj.value;
      }
    }
    
    // Cargos adicionales
    const waitingTimeCharge = (options.waitingHours || 0) * (config.additionalCharges?.waitingHourRate || 10);
    const extraPassengerCharge = Math.max(0, ((options.passengerCount || 1) - 1)) * (config.additionalCharges?.extraPassengerRate || 20);
    
    // Subtotal
    let subtotal = baseRate + distanceCharge + serviceTypeAdjustment + waitingTimeCharge + extraPassengerCharge;
    
    // Aplicar ajuste por código SAP si existe
    if (options.serviceCode && config.sapCodeAdjustments) {
      const sapAdjustment = config.sapCodeAdjustments.find((adj: any) => adj.code === options.serviceCode);
      if (sapAdjustment) {
        if (sapAdjustment.adjustmentType === 'multiplier') {
          subtotal *= sapAdjustment.adjustmentValue;
        } else if (sapAdjustment.adjustmentType === 'percentage') {
          subtotal += subtotal * (sapAdjustment.adjustmentValue / 100);
        } else {
          subtotal += sapAdjustment.adjustmentValue;
        }
      }
    }
    
    // Aplicar precio mínimo
    const finalPrice = Math.max(config.minimumPrice || 35, Math.round(subtotal));
    
    const breakdown: PriceBreakdown = {
      baseRate,
      distanceCharge: Math.round(distanceCharge),
      serviceTypeAdjustment: Math.round(serviceTypeAdjustment),
      waitingTimeCharge,
      extraPassengerCharge,
      subtotal: Math.round(subtotal),
      finalPrice
    };
    
    return {
      price: finalPrice,
      breakdown
    };
  }
  
  /**
   * Busca precio en la base de datos o calcula uno nuevo (método original)
   */
  static async getPriceForRoute(
    from: string,
    to: string,
    options: {
      serviceCode?: string;
      waitingHours?: number;
      passengerCount?: number;
    } = {}
  ): Promise<{
    price: number;
    source: 'database' | 'calculated';
    breakdown?: PriceBreakdown;
    distance?: number;
    routeCode?: string;
  }> {
    try {
      // Primero buscar en la base de datos
      const fromUpper = from.toUpperCase().trim();
      const toUpper = to.toUpperCase().trim();
      
      const routePricing = await AgencyCatalog.findOne({
        type: 'route_pricing',
        $or: [
          {
            'metadata.fromLocation': fromUpper,
            'metadata.toLocation': toUpper
          },
          {
            'metadata.fromLocation': toUpper,
            'metadata.toLocation': fromUpper
          }
        ],
        isActive: true
      });
      
      if (routePricing) {
        // Si se encuentra en la base de datos, usar ese precio
        let price = routePricing.metadata?.basePrice || 0;
        
        // Agregar cargos adicionales
        if (options.waitingHours) {
          price += options.waitingHours * (routePricing.metadata?.waitingTimePrice || 10);
        }
        if (options.passengerCount && options.passengerCount > 1) {
          const extraPassengers = options.passengerCount - 1;
          price += extraPassengers * (routePricing.metadata?.pricePerPerson || 20);
        }
        
        return {
          price,
          source: 'database',
          routeCode: routePricing.code,
          distance: this.getDistance(from, to)
        };
      }
      
      // Si no se encuentra, calcular precio
      const calculated = this.calculatePrice(from, to, options);
      
      return {
        price: calculated.price,
        source: 'calculated',
        breakdown: calculated.breakdown,
        distance: calculated.distance
      };
      
    } catch (error) {
      console.error('Error getting price for route:', error);
      
      // En caso de error, calcular precio
      const calculated = this.calculatePrice(from, to, options);
      
      return {
        price: calculated.price,
        source: 'calculated',
        breakdown: calculated.breakdown,
        distance: calculated.distance
      };
    }
  }
  
  /**
   * Valida si una ruta existe en el sistema
   */
  static isValidRoute(from: string, to: string): boolean {
    const fromUpper = from.toUpperCase().trim();
    const toUpper = to.toUpperCase().trim();
    
    // Verificar si está en la matriz de distancias
    return !!(DISTANCE_MATRIX[fromUpper]?.[toUpper] || 
              DISTANCE_MATRIX[toUpper]?.[fromUpper]);
  }
  
  /**
   * Obtiene todas las rutas disponibles desde una ubicación
   */
  static getAvailableRoutesFrom(location: string): string[] {
    const locationUpper = location.toUpperCase().trim();
    const routes: Set<string> = new Set();
    
    // Buscar en la matriz de distancias
    if (DISTANCE_MATRIX[locationUpper]) {
      Object.keys(DISTANCE_MATRIX[locationUpper]).forEach(dest => routes.add(dest));
    }
    
    // Buscar ubicaciones que tienen rutas hacia esta ubicación
    Object.entries(DISTANCE_MATRIX).forEach(([origin, destinations]) => {
      if (destinations[locationUpper]) {
        routes.add(origin);
      }
    });
    
    return Array.from(routes);
  }
}

export default AgencyPricingService;