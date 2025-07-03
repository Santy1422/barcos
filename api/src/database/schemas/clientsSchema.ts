import mongoose from 'mongoose';

// Schema para dirección
const addressSchema = new mongoose.Schema({
  province: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  corregimiento: {
    type: String,
    required: true
  },
  fullAddress: {
    type: String,
    required: false
  }
}, { _id: false });

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
    type: addressSchema,
    required: function() { return this.type === 'natural'; }
  },
  // Campos para cliente jurídico
  companyName: {
    type: String,
    required: function() { return this.type === 'juridico'; }
  },
  ruc: {
    type: String,
    required: function() { return this.type === 'juridico'; }
  },
  dv: {
    type: String,
    required: function() { return this.type === 'juridico'; }
  },
  fiscalAddress: {
    type: addressSchema,
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
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
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
clientsSchema.index({ ruc: 1 }, { sparse: true });
clientsSchema.index({ documentNumber: 1 }, { sparse: true });
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