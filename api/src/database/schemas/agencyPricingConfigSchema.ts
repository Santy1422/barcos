import { Schema, model, Document, Types } from 'mongoose';

export interface IAgencyPricingConfig extends Document {
  // Identificación
  name: string;
  code: string;
  description?: string;
  
  // Configuración de precios base
  minimumPrice: number;          // Precio mínimo absoluto
  baseFee: number;                // Tarifa base fija
  
  // Tarifas por distancia (escalones)
  distanceRates: Array<{
    minKm: number;                // Desde km
    maxKm: number;                // Hasta km
    ratePerKm: number;            // Precio por km en este rango
    fixedPrice?: number;          // O precio fijo para este rango (opcional)
  }>;
  
  // Ajustes por tipo de servicio (multiplicadores o montos fijos)
  serviceAdjustments: {
    airport?: { type: 'percentage' | 'fixed'; value: number };
    medical?: { type: 'percentage' | 'fixed'; value: number };
    vip?: { type: 'percentage' | 'fixed'; value: number };
    security?: { type: 'percentage' | 'fixed'; value: number };
    emergency?: { type: 'percentage' | 'fixed'; value: number };
    weekend?: { type: 'percentage' | 'fixed'; value: number };
    holiday?: { type: 'percentage' | 'fixed'; value: number };
    nightTime?: { type: 'percentage' | 'fixed'; value: number };
    custom?: Array<{
      name: string;
      condition: string;
      type: 'percentage' | 'fixed';
      value: number;
    }>;
  };
  
  // Cargos adicionales
  additionalCharges: {
    waitingHourRate: number;      // Precio por hora de espera
    extraPassengerRate: number;   // Precio por pasajero adicional
    luggageRate?: number;          // Precio por maleta adicional
    tollsIncluded?: boolean;       // Si los peajes están incluidos
    fuelSurcharge?: number;        // Recargo por combustible
    customCharges?: Array<{
      name: string;
      description?: string;
      type: 'per_unit' | 'fixed' | 'percentage';
      value: number;
    }>;
  };
  
  // Descuentos
  discounts?: {
    volumeDiscounts?: Array<{
      minServices: number;         // Mínimo de servicios al mes
      discountPercentage: number;   // Descuento aplicado
    }>;
    clientDiscounts?: Array<{
      clientId: Types.ObjectId;
      discountPercentage: number;
    }>;
    promotionalDiscounts?: Array<{
      code: string;
      validFrom: Date;
      validTo: Date;
      discountPercentage: number;
      maxUses?: number;
      currentUses?: number;
    }>;
  };
  
  // Códigos SAP y sus ajustes
  sapCodeAdjustments?: Array<{
    code: string;
    name: string;
    adjustmentType: 'multiplier' | 'fixed' | 'percentage';
    adjustmentValue: number;
    priority?: number;  // Para resolver conflictos cuando aplican múltiples códigos
  }>;
  
  // Rutas específicas con precios fijos (override)
  fixedRoutes?: Array<{
    from: string;
    to: string;
    price: number;
    sapCode?: string;
    conditions?: {
      minPassengers?: number;
      maxPassengers?: number;
      timeFrom?: string;  // HH:mm
      timeTo?: string;    // HH:mm
      daysOfWeek?: number[]; // 0=domingo, 6=sábado
    };
  }>;
  
  // Matriz de distancias personalizada
  distanceMatrix?: Array<{
    from: string;
    to: string;
    distance: number;
    estimatedTime?: number;  // Minutos
    tollCost?: number;
  }>;
  
  // Ubicaciones y sus categorías
  locations?: Array<{
    name: string;
    category: 'airport' | 'port' | 'hotel' | 'hospital' | 'office' | 'residential' | 'other';
    zone?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    surcharge?: number;  // Recargo específico de ubicación
  }>;
  
  // Horarios especiales
  timeBasedPricing?: {
    nightHours?: {
      from: string;  // HH:mm
      to: string;    // HH:mm
      surchargeType: 'percentage' | 'fixed';
      surchargeValue: number;
    };
    peakHours?: Array<{
      from: string;
      to: string;
      daysOfWeek: number[];
      surchargeType: 'percentage' | 'fixed';
      surchargeValue: number;
    }>;
  };
  
  // Configuración de redondeo
  roundingRules?: {
    method: 'none' | 'up' | 'down' | 'nearest';
    precision: number;  // 0 para enteros, 1 para .5, 2 para .00, etc.
  };
  
  // Estado y auditoría
  isActive: boolean;
  isDefault?: boolean;  // Si es la configuración por defecto
  effectiveFrom?: Date;
  effectiveTo?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  version?: number;  // Para control de versiones de la configuración
}

const agencyPricingConfigSchema = new Schema<IAgencyPricingConfig>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    
    description: {
      type: String,
      trim: true
    },
    
    // Precios base
    minimumPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 35
    },
    
    baseFee: {
      type: Number,
      required: true,
      min: 0,
      default: 25
    },
    
    // Tarifas por distancia
    distanceRates: [{
      minKm: { type: Number, required: true, min: 0 },
      maxKm: { type: Number, required: true, min: 0 },
      ratePerKm: { type: Number, required: true, min: 0 },
      fixedPrice: { type: Number, min: 0 }
    }],
    
    // Ajustes por tipo de servicio
    serviceAdjustments: {
      airport: {
        type: { type: String, enum: ['percentage', 'fixed'] },
        value: { type: Number }
      },
      medical: {
        type: { type: String, enum: ['percentage', 'fixed'] },
        value: { type: Number }
      },
      vip: {
        type: { type: String, enum: ['percentage', 'fixed'] },
        value: { type: Number }
      },
      security: {
        type: { type: String, enum: ['percentage', 'fixed'] },
        value: { type: Number }
      },
      emergency: {
        type: { type: String, enum: ['percentage', 'fixed'] },
        value: { type: Number }
      },
      weekend: {
        type: { type: String, enum: ['percentage', 'fixed'] },
        value: { type: Number }
      },
      holiday: {
        type: { type: String, enum: ['percentage', 'fixed'] },
        value: { type: Number }
      },
      nightTime: {
        type: { type: String, enum: ['percentage', 'fixed'] },
        value: { type: Number }
      },
      custom: [{
        name: { type: String, required: true },
        condition: { type: String },
        type: { type: String, enum: ['percentage', 'fixed'], required: true },
        value: { type: Number, required: true }
      }]
    },
    
    // Cargos adicionales
    additionalCharges: {
      waitingHourRate: {
        type: Number,
        min: 0,
        default: 10
      },
      extraPassengerRate: {
        type: Number,
        min: 0,
        default: 20
      },
      luggageRate: {
        type: Number,
        min: 0
      },
      tollsIncluded: {
        type: Boolean,
        default: false
      },
      fuelSurcharge: {
        type: Number,
        min: 0
      },
      customCharges: [{
        name: { type: String, required: true },
        description: { type: String },
        type: { type: String, enum: ['per_unit', 'fixed', 'percentage'], required: true },
        value: { type: Number, required: true }
      }]
    },
    
    // Descuentos
    discounts: {
      volumeDiscounts: [{
        minServices: { type: Number, required: true, min: 0 },
        discountPercentage: { type: Number, required: true, min: 0, max: 100 }
      }],
      clientDiscounts: [{
        clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
        discountPercentage: { type: Number, required: true, min: 0, max: 100 }
      }],
      promotionalDiscounts: [{
        code: { type: String, required: true, uppercase: true },
        validFrom: { type: Date, required: true },
        validTo: { type: Date, required: true },
        discountPercentage: { type: Number, required: true, min: 0, max: 100 },
        maxUses: { type: Number, min: 1 },
        currentUses: { type: Number, default: 0 }
      }]
    },
    
    // Códigos SAP
    sapCodeAdjustments: [{
      code: { type: String, required: true, uppercase: true },
      name: { type: String, required: true },
      adjustmentType: { type: String, enum: ['multiplier', 'fixed', 'percentage'], required: true },
      adjustmentValue: { type: Number, required: true },
      priority: { type: Number, default: 0 }
    }],
    
    // Rutas fijas
    fixedRoutes: [{
      from: { type: String, required: true, uppercase: true },
      to: { type: String, required: true, uppercase: true },
      price: { type: Number, required: true, min: 0 },
      sapCode: { type: String, uppercase: true },
      conditions: {
        minPassengers: { type: Number, min: 1 },
        maxPassengers: { type: Number, min: 1 },
        timeFrom: { type: String },
        timeTo: { type: String },
        daysOfWeek: [{ type: Number, min: 0, max: 6 }]
      }
    }],
    
    // Matriz de distancias
    distanceMatrix: [{
      from: { type: String, required: true, uppercase: true },
      to: { type: String, required: true, uppercase: true },
      distance: { type: Number, required: true, min: 0 },
      estimatedTime: { type: Number, min: 0 },
      tollCost: { type: Number, min: 0 }
    }],
    
    // Ubicaciones
    locations: [{
      name: { type: String, required: true, uppercase: true },
      category: { 
        type: String, 
        enum: ['airport', 'port', 'hotel', 'hospital', 'office', 'residential', 'other'],
        required: true
      },
      zone: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      },
      surcharge: { type: Number, min: 0 }
    }],
    
    // Precios por horario
    timeBasedPricing: {
      nightHours: {
        from: { type: String },
        to: { type: String },
        surchargeType: { type: String, enum: ['percentage', 'fixed'] },
        surchargeValue: { type: Number }
      },
      peakHours: [{
        from: { type: String, required: true },
        to: { type: String, required: true },
        daysOfWeek: [{ type: Number, min: 0, max: 6 }],
        surchargeType: { type: String, enum: ['percentage', 'fixed'], required: true },
        surchargeValue: { type: Number, required: true }
      }]
    },
    
    // Reglas de redondeo
    roundingRules: {
      method: {
        type: String,
        enum: ['none', 'up', 'down', 'nearest'],
        default: 'nearest'
      },
      precision: {
        type: Number,
        default: 0,
        min: 0,
        max: 2
      }
    },
    
    // Estado
    isActive: {
      type: Boolean,
      default: true
    },
    
    isDefault: {
      type: Boolean,
      default: false
    },
    
    effectiveFrom: {
      type: Date
    },
    
    effectiveTo: {
      type: Date
    },
    
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    
    version: {
      type: Number,
      default: 1
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
    }
  }
);

// Índices
agencyPricingConfigSchema.index({ code: 1 });
agencyPricingConfigSchema.index({ isActive: 1, isDefault: 1 });
agencyPricingConfigSchema.index({ effectiveFrom: 1, effectiveTo: 1 });
agencyPricingConfigSchema.index({ 'fixedRoutes.from': 1, 'fixedRoutes.to': 1 });
agencyPricingConfigSchema.index({ 'distanceMatrix.from': 1, 'distanceMatrix.to': 1 });

// Validación: solo una configuración por defecto activa
agencyPricingConfigSchema.pre('save', async function(next) {
  if (this.isDefault && this.isActive) {
    // Desactivar otras configuraciones por defecto
    await model('AgencyPricingConfig').updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Método para obtener la configuración activa
agencyPricingConfigSchema.statics.getActiveConfig = async function(date?: Date) {
  const targetDate = date || new Date();
  
  // Buscar configuración por defecto activa en la fecha
  const config = await this.findOne({
    isActive: true,
    isDefault: true,
    $and: [
      {
        $or: [
          { effectiveFrom: { $exists: false } },
          { effectiveFrom: { $lte: targetDate } }
        ]
      },
      {
        $or: [
          { effectiveTo: { $exists: false } },
          { effectiveTo: { $gte: targetDate } }
        ]
      }
    ]
  });
  
  return config;
};

const AgencyPricingConfig = model<IAgencyPricingConfig>('AgencyPricingConfig', agencyPricingConfigSchema);

export default AgencyPricingConfig;