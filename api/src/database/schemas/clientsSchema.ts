import mongoose from 'mongoose';

// Schema principal de clientes
const clientsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["natural", "juridico"],
    required: true
  },
  // Campos para cliente natural
  fullName: {
    type: String,
    required: function() { return this.type === 'natural'; }
  },
  documentType: {
    type: String,
    enum: ["cedula", "pasaporte"],
    required: function() { return this.type === 'natural'; }
  },
  documentNumber: {
    type: String,
    required: function() { return this.type === 'natural'; }
  },
  address: {
    type: String,
    required: false
  },
  // Campos para cliente jurídico
  companyName: {
    type: String,
    required: function() { return this.type === 'juridico'; }
  },
  name: {
    type: String,
    required: false,
    trim: true
  },
  ruc: {
    type: String,
    required: function() { return this.type === 'juridico'; }
  },
  contactName: {
    type: String,
    required: false
  },
  // Campos comunes
  email: {
    type: String,
    required: function() { return this.type === 'juridico'; }
  },
  phone: {
    type: String,
    required: false
  },
  // Campo para código SAP
  sapCode: {
    type: String,
    required: true
    // Nota: unique se maneja con un índice compuesto con module más abajo
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Campo para identificar los módulos del cliente (puede pertenecer a varios)
  module: {
    type: [String],
    enum: ["ptyss", "trucking", "agency"],
    default: ["ptyss"] // Por defecto ptyss para mantener compatibilidad
  },
  
  // Relaciones
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  
  invoices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'invoices'
  }],
  
  records: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'records'
  }]
}, {
  timestamps: true
});

// Índices
clientsSchema.index({ type: 1 });
clientsSchema.index({ isActive: 1 });
clientsSchema.index({ module: 1 }); // Índice para búsquedas con $in
clientsSchema.index({ ruc: 1 }, { sparse: true });
clientsSchema.index({ documentNumber: 1 }, { sparse: true });
clientsSchema.index({ sapCode: 1 }); // Índice simple para sapCode
clientsSchema.index({ name: 1 }, { sparse: true });
clientsSchema.index({ createdBy: 1 });
clientsSchema.index({ createdAt: -1 });

// Virtual para contar facturas
clientsSchema.virtual('invoiceCount', {
  ref: 'invoices',
  localField: '_id',
  foreignField: 'clientId',
  count: true
});

export default clientsSchema;