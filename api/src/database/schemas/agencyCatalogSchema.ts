import { Schema, model, Document, Model } from 'mongoose';

export type CatalogType = 'site_type' | 'location' | 'nationality' | 'rank' | 'vessel' | 'transport_company' | 'driver' | 'taulia_code' | 'route_pricing' | 'crew_rank' | 'crew_change_service';

// Interface para métodos estáticos del modelo
interface IAgencyCatalogModel extends Model<IAgencyCatalog> {
  findByType(type: CatalogType): Promise<IAgencyCatalog[]>;
  findActiveByName(type: CatalogType, name: string): Promise<IAgencyCatalog | null>;
  deactivate(id: string): Promise<IAgencyCatalog | null>;
  reactivate(id: string): Promise<IAgencyCatalog | null>;
  findOrCreate(type: CatalogType, name: string, additionalData?: Partial<IAgencyCatalog>): Promise<IAgencyCatalog>;
  getAllGroupedByType(): Promise<Record<CatalogType, IAgencyCatalog[]>>;
  searchAll(searchTerm: string): Promise<IAgencyCatalog[]>;
}

export interface IAgencyCatalog extends Document {
  type: CatalogType;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

const agencyCatalogSchema = new Schema<IAgencyCatalog>(
  {
    type: {
      type: String,
      enum: ['site_type', 'location', 'nationality', 'rank', 'vessel', 'transport_company', 'driver', 'taulia_code', 'route_pricing', 'crew_rank', 'crew_change_service'],
      required: true
    },
    
    name: {
      type: String,
      required: true,
      trim: true
    },
    
    code: {
      type: String,
      trim: true,
      sparse: true
    },
    
    description: {
      type: String,
      trim: true
    },
    
    isActive: {
      type: Boolean,
      default: true
    },
    
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
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

// Indexes
agencyCatalogSchema.index({ type: 1, isActive: 1 });
agencyCatalogSchema.index({ type: 1, name: 1 }, { unique: true });
agencyCatalogSchema.index({ name: 'text' });
agencyCatalogSchema.index({ code: 1 }, { sparse: true });

// Pre-save middleware for normalization
agencyCatalogSchema.pre('save', function(next) {
  // Normalize name based on type
  if (this.type === 'location' || this.type === 'vessel' || this.type === 'nationality') {
    this.name = this.name.toUpperCase();
  } else if (this.type === 'rank') {
    // Capitalize first letter of each word for ranks
    this.name = this.name.replace(/\b\w/g, l => l.toUpperCase());
  } else if (this.type === 'driver') {
    // Proper case for driver names
    this.name = this.name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Validate metadata based on type
  if (this.type === 'taulia_code' && this.metadata) {
    // Ensure price exists for taulia codes
    if (typeof this.metadata.price === 'undefined') {
      this.metadata.price = 0;
    }
  } else if (this.type === 'route_pricing' && this.metadata) {
    // Ensure required pricing fields exist
    if (typeof this.metadata.basePrice === 'undefined') {
      this.metadata.basePrice = 0;
    }
    if (typeof this.metadata.pricePerPerson === 'undefined') {
      this.metadata.pricePerPerson = 20;
    }
    if (typeof this.metadata.waitingTimePrice === 'undefined') {
      this.metadata.waitingTimePrice = 10;
    }
    if (!this.metadata.currency) {
      this.metadata.currency = 'USD';
    }
  }
  
  next();
});

// Custom validation for metadata
agencyCatalogSchema.path('metadata').validate(function(value: any) {
  if (!value) return true;
  
  // Type-specific validations
  switch (this.type) {
    case 'taulia_code':
      // Must have a numeric price
      if (value.price !== undefined && typeof value.price !== 'number') {
        return false;
      }
      break;
    case 'location':
      // siteType should be a string if present
      if (value.siteType && typeof value.siteType !== 'string') {
        return false;
      }
      break;
    case 'driver':
      // Phone should be a string if present
      if (value.phone && typeof value.phone !== 'string') {
        return false;
      }
      break;
    case 'route_pricing':
      // Validate pricing fields
      if (value.basePrice !== undefined && typeof value.basePrice !== 'number') {
        return false;
      }
      if (value.pricePerPerson !== undefined && typeof value.pricePerPerson !== 'number') {
        return false;
      }
      if (value.waitingTimePrice !== undefined && typeof value.waitingTimePrice !== 'number') {
        return false;
      }
      if (value.fromLocation && typeof value.fromLocation !== 'string') {
        return false;
      }
      if (value.toLocation && typeof value.toLocation !== 'string') {
        return false;
      }
      break;
  }
  
  return true;
}, 'Invalid metadata for catalog type');

// Static methods

// Find all active items by type
agencyCatalogSchema.statics.findByType = function(type: CatalogType) {
  return this.find({ type, isActive: true }).sort({ name: 1 });
};

// Find active item by type and name
agencyCatalogSchema.statics.findActiveByName = function(type: CatalogType, name: string) {
  // Normalize name based on type
  let searchName = name.trim();
  if (type === 'site_type' || type === 'location' || type === 'vessel' || type === 'nationality') {
    searchName = searchName.toUpperCase();
  }
  
  return this.findOne({ type, name: searchName, isActive: true });
};

// Soft delete (deactivate)
agencyCatalogSchema.statics.deactivate = async function(id: string) {
  return this.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
};

// Reactivate
agencyCatalogSchema.statics.reactivate = async function(id: string) {
  return this.findByIdAndUpdate(
    id,
    { isActive: true },
    { new: true }
  );
};

// Find or create
agencyCatalogSchema.statics.findOrCreate = async function(
  type: CatalogType,
  name: string,
  additionalData?: Partial<IAgencyCatalog>
) {
  let item = await (this as any).findActiveByName(type, name);
  
  if (!item) {
    item = await this.create({
      type,
      name,
      ...additionalData
    });
  }
  
  return item;
};

// Get all active catalogs grouped by type
agencyCatalogSchema.statics.getAllGroupedByType = async function() {
  const items = await this.find({ isActive: true }).sort({ type: 1, name: 1 });
  
  const grouped: Record<CatalogType, IAgencyCatalog[]> = {
    site_type: [],
    location: [],
    nationality: [],
    rank: [],
    vessel: [],
    transport_company: [],
    driver: [],
    taulia_code: [],
    route_pricing: [],
    crew_rank: [],
    crew_change_service: []
  };
  
  items.forEach(item => {
    grouped[item.type].push(item);
  });
  
  return grouped;
};

// Search across all types
agencyCatalogSchema.statics.searchAll = function(searchTerm: string) {
  return this.find({
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { code: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  }).sort({ type: 1, name: 1 });
};

// Virtual for display name (includes code if available)
agencyCatalogSchema.virtual('displayName').get(function() {
  if (this.code) {
    return `${this.code} - ${this.name}`;
  }
  return this.name;
});

// Virtual for type label
agencyCatalogSchema.virtual('typeLabel').get(function() {
  const labels: Record<CatalogType, string> = {
    'site_type': 'Tipo de Sitio',
    'location': 'Ubicación',
    'nationality': 'Nacionalidad',
    'rank': 'Rango',
    'vessel': 'Buque',
    'transport_company': 'Empresa de Transporte',
    'driver': 'Conductor',
    'taulia_code': 'Código Taulia',
    'route_pricing': 'Precio de Ruta',
    'crew_rank': 'Rango de Tripulación',
    'crew_change_service': 'Servicio de Cambio de Tripulación'
  };
  return labels[this.type] || this.type;
});

const AgencyCatalog = model<IAgencyCatalog, IAgencyCatalogModel>('AgencyCatalog', agencyCatalogSchema);

export default AgencyCatalog;