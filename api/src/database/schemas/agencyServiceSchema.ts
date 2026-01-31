import { Schema, model, Document, Types } from 'mongoose';

// Crew Member interface
export interface ICrewMember {
  id: string;
  name: string;
  nationality: string;
  crewRank: string;
  crewCategory: string;
  status: 'Visit' | 'On Signer';
  flight: string;
}

export interface IAgencyService extends Document {
  // Module identification
  module: string;
  
  // Status management
  status: 'tentative' | 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'ready_for_invoice' | 'prefacturado' | 'facturado' | 'nota_de_credito';
  
  // Review status
  reviewStatus: 'pending_review' | 'reviewed' | 'approved' | 'rejected';
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  
  // Dates
  serviceDate: Date;
  pickupDate: Date;
  pickupTime: string;
  
  // Locations
  pickupLocation: string;
  dropoffLocation: string;
  returnDropoffLocation?: string; // For Round Trip services
  
  // Vessel information (opcional)
  vessel?: string;
  voyage?: string;
  
  // Crew information (Legacy - mantener para compatibilidad)
  crewName?: string;
  crewRank?: string;
  nationality?: string;
  
  // Crew members (Nuevo - array de crew members)
  crewMembers: ICrewMember[];
  
  // Move type
  moveType?: 'RT' | 'SINGLE';
  
  // Passenger count
  passengerCount?: number;
  
  // Approval flag
  approve?: boolean;
  
  // Transport information
  transportCompany?: string;
  driver?: string;
  driverName?: string;
  flightInfo?: string;
  
  // Service details
  waitingTime: number; // Stored in MINUTES
  waitingTimePrice?: number; // Price for waiting time (TRK137 in XML)
  comments?: string;
  notes?: string;
  serviceCode?: string;
  
  // Pricing
  price?: number;
  currency: string;
  discountAmount?: number;
  discountDescription?: string;
  
  // Client information (Opcional - se asigna al facturar)
  clientId?: Types.ObjectId;
  clientName?: string;
  
  // References
  prefacturaId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  sapDocumentNumber?: string;
  
  // SAP Integration fields
  invoiceNumber?: string;
  invoiceDate?: Date;
  xmlFilePath?: string;
  sapProcessedAt?: Date;
  sentToSap?: boolean;
  sentToSapAt?: Date;
  sapFileName?: string;
  xmlData?: {
    xml: string;
    fileName: string;
    generatedAt: Date;
  };
  
  // Attachments
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    uploadDate: Date;
  }>;
  
  // Audit fields
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const agencyServiceSchema = new Schema<IAgencyService>(
  {
    // Module identification
    module: {
      type: String,
      default: 'AGENCY',
      enum: ['AGENCY'],
      required: true
    },
    
    // Status management - NO debe pasar automáticamente a prefactura
    status: {
      type: String,
      enum: ['tentative', 'pending', 'in_progress', 'completed', 'cancelled', 'ready_for_invoice', 'prefacturado', 'facturado', 'nota_de_credito'],
      default: 'tentative',
      required: true
    },
    
    // Status de revisión (requerido según documento)
    reviewStatus: {
      type: String,
      enum: ['pending_review', 'reviewed', 'approved', 'rejected'],
      default: 'pending_review'
    },
    
    // Información de revisión
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'users' },
    reviewedAt: Date,
    reviewNotes: String,
    
    // Dates
    serviceDate: {
      type: Date,
      required: true
    },
    
    pickupDate: {
      type: Date,
      required: true
    },
    
    pickupTime: {
      type: String,
      required: true,
      trim: true
    },
    
    // Locations
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
    
    returnDropoffLocation: {
      type: String,
      trim: true,
      uppercase: true
    },
    
    // Vessel information (opcional)
    vessel: {
      type: String,
      required: false,
      trim: true,
      uppercase: true
    },
    
    voyage: {
      type: String,
      trim: true
    },
    
    // Crew information (Legacy - para compatibilidad con datos antiguos)
    crewName: {
      type: String,
      trim: true
    },
    
    crewRank: {
      type: String,
      trim: true
    },
    
    nationality: {
      type: String,
      trim: true,
      uppercase: true
    },
    
    // Crew members (Nuevo - array de crew members)
    crewMembers: [{
      id: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true,
        trim: true
      },
      nationality: {
        type: String,
        required: true,
        trim: true
      },
      crewRank: {
        type: String,
        required: true,
        trim: true
      },
      crewCategory: {
        type: String,
        required: true,
        trim: true
      },
      status: {
        type: String,
        enum: ['Visit', 'On Signer'],
        required: true
      },
      flight: {
        type: String,
        trim: true,
        default: ''
      }
    }],
    
    // Move type
    moveType: {
      type: String,
      enum: ['RT', 'SINGLE', 'INTERNAL', 'BAGS_CLAIM', 'DOCUMENTATION', 'NO_SHOW'],
      trim: true
    },
    
    // Passenger count
    passengerCount: {
      type: Number,
      min: 0
    },
    
    // Approval flag
    approve: {
      type: Boolean,
      default: false
    },
    
    // Transport information
    transportCompany: {
      type: String,
      trim: true
    },
    
    driver: {
      type: String,
      trim: true
    },
    
    driverName: {
      type: String,
      trim: true
    },
    
    flightInfo: {
      type: String,
      trim: true
    },
    
    // Service details
    waitingTime: {
      type: Number,
      default: 0,
      min: 0,
      // NOTE: waitingTime is stored in MINUTES
    },
    
    waitingTimePrice: {
      type: Number,
      default: 0,
      min: 0,
      // NOTE: Price for waiting time (used in TRK137 XML item)
    },
    
    comments: {
      type: String,
      trim: true
    },
    
    notes: {
      type: String,
      trim: true
    },
    
    serviceCode: {
      type: String,
      trim: true,
      uppercase: true
    },
    
    // Pricing
    price: {
      type: Number,
      min: 0
    },
    
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'PAB'],
      uppercase: true
    },
    
    discountAmount: {
      type: Number,
      required: false,
      default: 0,
      min: 0
    },
    
    discountDescription: {
      type: String,
      required: false,
      trim: true,
      maxlength: 200
    },
    
    // Client information (Opcional - se asigna al facturar)
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'clients'
    },
    
    clientName: {
      type: String,
      trim: true
    },
    
    // References to invoices
    prefacturaId: {
      type: Schema.Types.ObjectId,
      ref: 'invoices'
    },
    
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'invoices'
    },
    
    sapDocumentNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    
    // SAP Integration fields
    invoiceNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    
    invoiceDate: {
      type: Date
    },
    
    xmlFilePath: {
      type: String,
      trim: true
    },
    
    sapProcessedAt: {
      type: Date
    },
    
    sentToSap: {
      type: Boolean,
      default: false
    },
    
    sentToSapAt: {
      type: Date
    },
    
    sapFileName: {
      type: String,
      trim: true
    },
    
    // XML Data (store complete XML for SAP)
    xmlData: {
      xml: String,
      fileName: String,
      generatedAt: Date
    },
    
    // Attachments array
    attachments: [{
      fileName: {
        type: String,
        required: true,
        trim: true
      },
      fileUrl: {
        type: String,
        required: true,
        trim: true
      },
      uploadDate: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Audit fields
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

// Indexes for better query performance
agencyServiceSchema.index({ clientId: 1, status: 1 });
agencyServiceSchema.index({ pickupDate: 1 });
agencyServiceSchema.index({ vessel: 1 });
agencyServiceSchema.index({ status: 1, createdAt: -1 });
agencyServiceSchema.index({ serviceCode: 1 });
agencyServiceSchema.index({ sapDocumentNumber: 1 });

// Middleware to sync fields
agencyServiceSchema.pre('save', function(next) {
  // Map pickupDate to serviceDate for compatibility
  if (this.pickupDate && !this.serviceDate) {
    this.serviceDate = this.pickupDate;
  }
  
  // Map comments to notes if notes is empty
  if (this.comments && !this.notes) {
    this.notes = this.comments;
  }
  
  next();
});

// Virtual for display status
agencyServiceSchema.virtual('displayStatus').get(function() {
  const statusMap: Record<string, string> = {
    'tentative': 'Tentativo',
    'pending': 'Pendiente',
    'in_progress': 'En Progreso',
    'completed': 'Completado',
    'cancelled': 'Cancelado',
    'prefacturado': 'Prefacturado',
    'facturado': 'Facturado',
    'nota_de_credito': 'Nota de Crédito'
  };
  return statusMap[this.status] || this.status;
});

// Add methods to interface
declare module 'mongoose' {
  interface Document {
    canBeInvoiced?(): boolean;
    canBeEdited?(): boolean;
  }
}

// Method to check if service can be invoiced
agencyServiceSchema.methods.canBeInvoiced = function(): boolean {
  return this.status === 'completed' && !this.invoiceId;
};

// Method to check if service can be edited
agencyServiceSchema.methods.canBeEdited = function(): boolean {
  return !['facturado'].includes(this.status);
};

// Static method to find services ready for invoicing
agencyServiceSchema.statics.findReadyForInvoicing = function(clientId?: string) {
  const query: any = {
    status: 'completed',
    invoiceId: { $exists: false }
  };
  
  if (clientId) {
    query.clientId = clientId;
  }
  
  return this.find(query).sort({ pickupDate: 1 });
};

// Static method to find services by date range
agencyServiceSchema.statics.findByDateRange = function(startDate: Date, endDate: Date, clientId?: string) {
  const query: any = {
    pickupDate: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (clientId) {
    query.clientId = clientId;
  }
  
  return this.find(query).sort({ pickupDate: -1 });
};

const AgencyService = model<IAgencyService>('AgencyService', agencyServiceSchema);

export default AgencyService;