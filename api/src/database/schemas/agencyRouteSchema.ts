import { Schema, model, Document, Types, Model } from 'mongoose';

// Tipos de ruta
export type RouteType = 'single' | 'roundtrip' | 'internal' | 'bags_claim' | 'documentation' | 'no_show';

// Interface para intervalos de precios por pasajeros
export interface PassengerPriceRange {
  minPassengers: number;  // Mínimo de pasajeros (ej: 1)
  maxPassengers: number;  // Máximo de pasajeros (ej: 3, o 999 para "8+")
  price: number;          // Precio para este rango
  description?: string;   // Descripción (ej: "1-3 pasajeros")
}

// Interface para precios por tipo de ruta
export interface RoutePricing {
  routeType: RouteType;                    // 'single' o 'roundtrip'
  passengerRanges: PassengerPriceRange[];  // Rangos de precios por cantidad de pasajeros
}

// Interface para métodos estáticos del modelo
interface IAgencyRouteModel extends Model<IAgencyRoute> {
  findByLocations(pickupLocation: string, dropoffLocation: string, activeOnly?: boolean): Promise<IAgencyRoute | null>;
  getPriceForRoute(pickupLocation: string, dropoffLocation: string, routeType: RouteType, passengerCount: number): Promise<any>;
  findAllActive(): Promise<IAgencyRoute[]>;
  findByLocation(location: string, activeOnly?: boolean): Promise<IAgencyRoute[]>;
  deactivate(id: string): Promise<IAgencyRoute | null>;
  reactivate(id: string): Promise<IAgencyRoute | null>;
}

// Interface del documento de ruta
export interface IAgencyRoute extends Document {
  // Identificación de la ruta
  name: string;                     // "LOCATION1 / LOCATION2"
  pickupLocation: string;           // Nombre de la ubicación de recogida
  dropoffLocation: string;          // Nombre de la ubicación de entrega
  pickupSiteType?: string;          // Site type de recogida (nuevo)
  dropoffSiteType?: string;         // Site type de entrega (nuevo)
  pickupLocationId?: Types.ObjectId; // Referencia al catálogo de ubicación
  dropoffLocationId?: Types.ObjectId; // Referencia al catálogo de ubicación
  
  // Pricing dinámico
  pricing: RoutePricing[];          // Array de precios (single y roundtrip)
  
  // Configuración adicional
  currency: string;                 // Moneda (USD por defecto)
  waitingTimeRate?: number;         // Tarifa por hora de espera
  extraPassengerRate?: number;      // Tarifa por pasajero extra (más allá del máximo)
  
  // Metadata
  description?: string;
  notes?: string;
  distance?: number;                // Distancia en km (opcional)
  estimatedDuration?: number;       // Duración estimada en minutos (opcional)
  
  // Estado
  isActive: boolean;
  
  // Auditoría
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  
  // Métodos de instancia
  calculatePrice(routeType: RouteType, passengerCount: number, waitingTimeHours?: number): number | null;
  getPriceBreakdown(routeType: RouteType, passengerCount: number, waitingTimeHours?: number): {
    basePrice: number;
    waitingTime: number;
    extraPassengers: number;
    total: number;
  } | null;
}

const passengerPriceRangeSchema = new Schema<PassengerPriceRange>({
  minPassengers: {
    type: Number,
    required: true,
    min: 1
  },
  maxPassengers: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  }
}, { _id: false });

const routePricingSchema = new Schema<RoutePricing>({
  routeType: {
    type: String,
    enum: ['single', 'roundtrip', 'internal', 'bags_claim', 'documentation', 'no_show'],
    required: true
  },
  passengerRanges: {
    type: [passengerPriceRangeSchema],
    required: true,
    validate: {
      validator: function(ranges: PassengerPriceRange[]) {
        return ranges && ranges.length > 0;
      },
      message: 'Al menos un rango de pasajeros es requerido'
    }
  }
}, { _id: false });

const agencyRouteSchema = new Schema<IAgencyRoute>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    
    pickupLocation: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    
    dropoffLocation: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    
    pickupSiteType: {
      type: String,
      trim: true,
      uppercase: true
    },
    
    dropoffSiteType: {
      type: String,
      trim: true,
      uppercase: true
    },
    
    pickupLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'AgencyCatalog'
    },
    
    dropoffLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'AgencyCatalog'
    },
    
    pricing: {
      type: [routePricingSchema],
      required: true,
      validate: {
        validator: function(pricing: RoutePricing[]) {
          return pricing && pricing.length > 0;
        },
        message: 'Al menos una configuración de precios es requerida'
      }
    },
    
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true
    },
    
    waitingTimeRate: {
      type: Number,
      min: 0,
      default: 10
    },
    
    extraPassengerRate: {
      type: Number,
      min: 0,
      default: 20
    },
    
    description: {
      type: String,
      trim: true
    },
    
    notes: {
      type: String,
      trim: true
    },
    
    distance: {
      type: Number,
      min: 0
    },
    
    estimatedDuration: {
      type: Number,
      min: 0
    },
    
    isActive: {
      type: Boolean,
      default: true
    },
    
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'users'
    },
    
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'users'
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

// Índices
agencyRouteSchema.index({ name: 1 }, { unique: true });
agencyRouteSchema.index({ pickupLocation: 1, dropoffLocation: 1 });
agencyRouteSchema.index({ pickupSiteType: 1, dropoffSiteType: 1 });
agencyRouteSchema.index({ isActive: 1 });
agencyRouteSchema.index({ pickupLocationId: 1, dropoffLocationId: 1 });

// Pre-save middleware para generar el nombre automáticamente
agencyRouteSchema.pre('save', function(next) {
  // Generar nombre si no existe
  if (!this.name || this.name.trim() === '') {
    // Usar site types si están disponibles, sino usar locations
    const pickupValue = this.pickupSiteType || this.pickupLocation;
    const dropoffValue = this.dropoffSiteType || this.dropoffLocation;
    this.name = `${pickupValue} / ${dropoffValue}`.toUpperCase();
  }
  
  // Normalizar ubicaciones y site types a mayúsculas
  if (this.pickupLocation) {
    this.pickupLocation = this.pickupLocation.toUpperCase();
  }
  if (this.dropoffLocation) {
    this.dropoffLocation = this.dropoffLocation.toUpperCase();
  }
  if (this.pickupSiteType) {
    this.pickupSiteType = this.pickupSiteType.toUpperCase();
  }
  if (this.dropoffSiteType) {
    this.dropoffSiteType = this.dropoffSiteType.toUpperCase();
  }
  
  next();
});

// Validación: pickup y dropoff deben ser diferentes
agencyRouteSchema.pre('save', function(next) {
  // Si usamos site types, validar que sean diferentes
  if (this.pickupSiteType && this.dropoffSiteType) {
    if (this.pickupSiteType.toUpperCase() === this.dropoffSiteType.toUpperCase()) {
      next(new Error('Pickup site type and dropoff site type must be different'));
      return;
    }
  }
  
  // Si usamos locations, validar que sean diferentes
  if (this.pickupLocation && this.dropoffLocation) {
    if (this.pickupLocation.toUpperCase() === this.dropoffLocation.toUpperCase()) {
      next(new Error('Pickup location and dropoff location must be different'));
      return;
    }
  }
  
  next();
});

// Static methods

// Buscar ruta por ubicaciones o site types
agencyRouteSchema.statics.findByLocations = function(
  this: IAgencyRouteModel,
  pickupLocation: string, 
  dropoffLocation: string, 
  activeOnly = true
) {
  const query: any = {
    $or: [
      // Buscar por locations (método legacy)
      {
        pickupLocation: pickupLocation.toUpperCase(),
        dropoffLocation: dropoffLocation.toUpperCase()
      },
      // Buscar por site types (método nuevo)
      {
        pickupSiteType: pickupLocation.toUpperCase(),
        dropoffSiteType: dropoffLocation.toUpperCase()
      }
    ]
  };
  
  if (activeOnly) {
    query.isActive = true;
  }
  
  return this.findOne(query);
};

// Buscar precio para una ruta específica
agencyRouteSchema.statics.getPriceForRoute = async function(
  this: IAgencyRouteModel,
  pickupLocation: string,
  dropoffLocation: string,
  routeType: RouteType,
  passengerCount: number
) {
  const route = await this.findByLocations(pickupLocation, dropoffLocation, true);
  
  if (!route) {
    return null;
  }
  
  // Buscar pricing para el tipo de ruta
  const pricingConfig = route.pricing.find((p: RoutePricing) => p.routeType === routeType);
  
  if (!pricingConfig) {
    return null;
  }
  
  // Buscar el rango de pasajeros apropiado
  const priceRange = pricingConfig.passengerRanges.find((range: PassengerPriceRange) => 
    passengerCount >= range.minPassengers && passengerCount <= range.maxPassengers
  );
  
  if (!priceRange) {
    return null;
  }
  
  return {
    route,
    basePrice: priceRange.price,
    passengerRange: priceRange,
    pricingConfig
  };
};

// Obtener todas las rutas activas
agencyRouteSchema.statics.findAllActive = function(this: IAgencyRouteModel) {
  return this.find({ isActive: true })
    .sort({ name: 1 })
    .populate('pickupLocationId')
    .populate('dropoffLocationId');
};

// Obtener rutas por ubicación (pickup o dropoff)
agencyRouteSchema.statics.findByLocation = function(this: IAgencyRouteModel, location: string, activeOnly = true) {
  const query: any = {
    $or: [
      { pickupLocation: location.toUpperCase() },
      { dropoffLocation: location.toUpperCase() }
    ]
  };
  
  if (activeOnly) {
    query.isActive = true;
  }
  
  return this.find(query).sort({ name: 1 });
};

// Soft delete (deactivate)
agencyRouteSchema.statics.deactivate = async function(this: IAgencyRouteModel, id: string) {
  return this.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
};

// Reactivate
agencyRouteSchema.statics.reactivate = async function(this: IAgencyRouteModel, id: string) {
  return this.findByIdAndUpdate(
    id,
    { isActive: true },
    { new: true }
  );
};

// Virtual para nombre de visualización
agencyRouteSchema.virtual('displayName').get(function() {
  return this.name;
});

// Virtual para verificar si tiene precios configurados
agencyRouteSchema.virtual('hasPricing').get(function() {
  return this.pricing && this.pricing.length > 0;
});

// Virtual para verificar si tiene precios de roundtrip
agencyRouteSchema.virtual('hasRoundtripPricing').get(function() {
  return this.pricing && this.pricing.some((p: RoutePricing) => p.routeType === 'roundtrip');
});

// Virtual para verificar si tiene precios de single
agencyRouteSchema.virtual('hasSinglePricing').get(function() {
  return this.pricing && this.pricing.some((p: RoutePricing) => p.routeType === 'single');
});

// Virtual para verificar si tiene precios de internal
agencyRouteSchema.virtual('hasInternalPricing').get(function() {
  return this.pricing && this.pricing.some((p: RoutePricing) => p.routeType === 'internal');
});

// Virtual para verificar si tiene precios de bags_claim
agencyRouteSchema.virtual('hasBagsClaimPricing').get(function() {
  return this.pricing && this.pricing.some((p: RoutePricing) => p.routeType === 'bags_claim');
});

// Virtual para verificar si tiene precios de documentation
agencyRouteSchema.virtual('hasDocumentationPricing').get(function() {
  return this.pricing && this.pricing.some((p: RoutePricing) => p.routeType === 'documentation');
});

// Método de instancia para calcular precio
agencyRouteSchema.methods.calculatePrice = function(
  routeType: RouteType,
  passengerCount: number,
  waitingTimeHours = 0
): number | null {
  // Buscar pricing para el tipo de ruta
  const pricingConfig = this.pricing.find((p: RoutePricing) => p.routeType === routeType);
  
  if (!pricingConfig) {
    return null;
  }
  
  // Buscar el rango de pasajeros apropiado
  const priceRange = pricingConfig.passengerRanges.find((range: PassengerPriceRange) => 
    passengerCount >= range.minPassengers && passengerCount <= range.maxPassengers
  );
  
  if (!priceRange) {
    return null;
  }
  
  let totalPrice = priceRange.price;
  
  // Agregar cargo por tiempo de espera si aplica
  if (waitingTimeHours > 0 && this.waitingTimeRate) {
    totalPrice += waitingTimeHours * this.waitingTimeRate;
  }
  
  // Agregar cargo por pasajeros extra si excede el máximo del rango
  if (passengerCount > priceRange.maxPassengers && this.extraPassengerRate) {
    const extraPassengers = passengerCount - priceRange.maxPassengers;
    totalPrice += extraPassengers * this.extraPassengerRate;
  }
  
  return totalPrice;
};

// Método de instancia para obtener breakdown de precio
agencyRouteSchema.methods.getPriceBreakdown = function(
  routeType: RouteType,
  passengerCount: number,
  waitingTimeHours = 0
) {
  const pricingConfig = this.pricing.find((p: RoutePricing) => p.routeType === routeType);
  
  if (!pricingConfig) {
    return null;
  }
  
  const priceRange = pricingConfig.passengerRanges.find((range: PassengerPriceRange) => 
    passengerCount >= range.minPassengers && passengerCount <= range.maxPassengers
  );
  
  if (!priceRange) {
    return null;
  }
  
  const breakdown = {
    basePrice: priceRange.price,
    waitingTime: 0,
    extraPassengers: 0,
    total: priceRange.price
  };
  
  if (waitingTimeHours > 0 && this.waitingTimeRate) {
    breakdown.waitingTime = waitingTimeHours * this.waitingTimeRate;
    breakdown.total += breakdown.waitingTime;
  }
  
  if (passengerCount > priceRange.maxPassengers && this.extraPassengerRate) {
    const extraPassengers = passengerCount - priceRange.maxPassengers;
    breakdown.extraPassengers = extraPassengers * this.extraPassengerRate;
    breakdown.total += breakdown.extraPassengers;
  }
  
  return breakdown;
};

const AgencyRoute = model<IAgencyRoute, IAgencyRouteModel>('AgencyRoute', agencyRouteSchema);

export default AgencyRoute;

