import mongoose from 'mongoose';

const invoicesSchema = new mongoose.Schema({
  module: {
    type: String,
    enum: ["trucking", "shipchandler", "agency", "ptyss"],
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  clientName: {
    type: String,
    required: true
  },
  clientRuc: {
    type: String,
    required: true
  },
  clientSapNumber: {
    type: String,
    required: true
  },
  issueDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: "USD"
  },
  subtotal: {
    type: Number,
    required: true
  },
  taxAmount: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["prefactura", "facturada", "anulada"],
    default: "prefactura"
  },
  xmlData: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  pdfData: {
    type: Buffer,
    required: false
  },
  relatedRecordIds: [{
    type: String,
    required: true
  }],
  notes: {
    type: String,
    required: false
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  // Campos para SAP
  sentToSap: {
    type: Boolean,
    default: false
  },
  sentToSapAt: {
    type: Date,
    required: false
  },
  sapFileName: {
    type: String,
    required: false
  },
  sapProtocol: {
    type: String,
    enum: ["FTP", "SFTP"],
    required: false
  },
  // Servicios adicionales para PTYSS
  additionalServices: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: false
    },
    serviceName: {
      type: String,
      required: false
    },
    amount: {
      type: Number,
      required: false
    }
  }],
  // Campos para descuentos - NUEVOS (agregados 2026-01-08)
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
  }
}, {
  timestamps: true
});

// Aplicar plugins
invoicesSchema.plugin(require('./plugins/toJSON.plugin'));

// Índices
invoicesSchema.index({ module: 1 });
invoicesSchema.index({ status: 1 });
invoicesSchema.index({ invoiceNumber: 1 });
invoicesSchema.index({ clientRuc: 1 });
invoicesSchema.index({ issueDate: 1 });
invoicesSchema.index({ sentToSap: 1 });
invoicesSchema.index({ sapFileName: 1 });

export default invoicesSchema;