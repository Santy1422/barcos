import mongoose from 'mongoose';

const invoicesSchema = new mongoose.Schema({
  module: {
    type: String,
    enum: ["trucking", "shipchandler", "agency"],
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
    enum: ["generada", "transmitida", "anulada", "pagada"],
    default: "generada"
  },
  xmlData: {
    type: String,
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
  }
}, {
  timestamps: true
});

// Índices
invoicesSchema.index({ module: 1 });
invoicesSchema.index({ status: 1 });
invoicesSchema.index({ invoiceNumber: 1 });
invoicesSchema.index({ clientRuc: 1 });
invoicesSchema.index({ issueDate: 1 });

export default invoicesSchema;