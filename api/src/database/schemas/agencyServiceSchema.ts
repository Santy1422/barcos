import { Schema, model, Document, Types } from 'mongoose';

export interface IAgencyService extends Document {
  // Module identification
  module: string;
  
  // Status management
  status: 'pending' | 'in_progress' | 'completed' | 'ready_for_invoice' | 'prefacturado' | 'facturado';
  
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
  
  // Vessel information
  vessel: string;
  voyage?: string;
  
  // Crew information
  crewName: string;
  crewRank?: string;
  nationality?: string;
  
  // Transport information
  transportCompany?: string;
  driverName?: string;
  flightInfo?: string;
  
  // Service details
  waitingTime: number;
  comments?: string;
  notes?: string;
  serviceCode?: string;
  
  // Pricing
  price?: number;
  currency: string;
  
  // Client information
  clientId: Types.ObjectId;
  clientName?: string;
  
  // References
  prefacturaId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  sapDocumentNumber?: string;
  
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
      enum: ['pending', 'in_progress', 'completed', 'ready_for_invoice', 'prefacturado', 'facturado'],
      default: 'pending',
      required: true
    },
    
    // Status de revisión (requerido según documento)
    reviewStatus: {
      type: String,
      enum: ['pending_review', 'reviewed', 'approved', 'rejected'],
      default: 'pending_review'
    },
    
    // Información de revisión
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
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
    
    // Vessel information
    vessel: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    
    voyage: {
      type: String,
      trim: true
    },
    
    // Crew information
    crewName: {
      type: String,
      required: true,
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
    
    // Transport information
    transportCompany: {
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
      min: 0
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
    
    // Client information
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true
    },
    
    clientName: {
      type: String,
      trim: true
    },
    
    // References to invoices
    prefacturaId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    
    sapDocumentNumber: {
      type: String,
      trim: true,
      uppercase: true
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
      ref: 'User'
    },
    
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
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
    'pending': 'Pendiente',
    'in_progress': 'En Progreso',
    'completed': 'Completado',
    'prefacturado': 'Prefacturado',
    'facturado': 'Facturado'
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