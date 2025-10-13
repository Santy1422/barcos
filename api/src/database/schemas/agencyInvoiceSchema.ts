import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAgencyInvoice extends Document {
  // Module identification
  module: 'AGENCY';
  
  // Invoice identification
  invoiceNumber: string;
  status: 'prefactura' | 'facturada';
  
  // Client information
  clientId: Types.ObjectId;
  clientName: string;
  clientRuc?: string;
  clientSapNumber: string;
  
  // Related services
  relatedServiceIds: Types.ObjectId[];
  
  // Financial information
  totalAmount: number;
  currency: string;
  
  // Dates
  issueDate: Date;
  dueDate?: Date;
  
  // XML and SAP integration
  xmlData?: {
    xml: string;
    fileName: string;
    generatedAt: Date;
  };
  sentToSap: boolean;
  sentToSapAt?: Date;
  sapFileName?: string;
  sapLogs?: Array<{
    timestamp: Date;
    level: 'info' | 'success' | 'error';
    message: string;
    details?: any;
  }>;
  
  // Additional details
  details?: {
    additionalServices?: Array<{
      id: string;
      name: string;
      description: string;
      amount: number;
    }>;
    notes?: string;
    trk137Amount?: number; // Tiempo de espera
    trk137Description?: string;
  };
  
  // Audit fields
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const agencyInvoiceSchema = new Schema<IAgencyInvoice>(
  {
    // Module identification
    module: {
      type: String,
      default: 'AGENCY',
      enum: ['AGENCY'],
      required: true
    },
    
    // Invoice identification
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    
    status: {
      type: String,
      enum: ['prefactura', 'facturada'],
      default: 'prefactura',
      required: true
    },
    
    // Client information
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'clients',
      required: true
    },
    
    clientName: {
      type: String,
      required: true,
      trim: true
    },
    
    clientRuc: {
      type: String,
      trim: true
    },
    
    clientSapNumber: {
      type: String,
      required: true,
      trim: true
    },
    
    // Related services
    relatedServiceIds: [{
      type: Schema.Types.ObjectId,
      ref: 'AgencyService',
      required: true
    }],
    
    // Financial information
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'PAB'],
      uppercase: true
    },
    
    // Dates
    issueDate: {
      type: Date,
      required: true
    },
    
    dueDate: {
      type: Date
    },
    
    // XML and SAP integration
    xmlData: {
      xml: String,
      fileName: String,
      generatedAt: Date
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
    
    sapLogs: [{
      timestamp: {
        type: Date,
        default: Date.now
      },
      level: {
        type: String,
        enum: ['info', 'success', 'error'],
        default: 'info'
      },
      message: {
        type: String,
        required: true
      },
      details: Schema.Types.Mixed
    }],
    
    // Additional details
    details: {
      additionalServices: [{
        id: String,
        name: String,
        description: String,
        amount: Number
      }],
      notes: String,
      trk137Amount: Number,
      trk137Description: String
    },
    
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
agencyInvoiceSchema.index({ module: 1, status: 1 });
agencyInvoiceSchema.index({ clientId: 1 });
agencyInvoiceSchema.index({ issueDate: -1 });
agencyInvoiceSchema.index({ invoiceNumber: 1 });
agencyInvoiceSchema.index({ sentToSap: 1 });
agencyInvoiceSchema.index({ createdAt: -1 });

// Create and export the model
const AgencyInvoice = mongoose.model<IAgencyInvoice>('AgencyInvoice', agencyInvoiceSchema);

export default AgencyInvoice;

