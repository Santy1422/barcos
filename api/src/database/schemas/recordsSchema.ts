import mongoose from 'mongoose';

// Schema para registros individuales de Excel
const excelRecordSchema = new mongoose.Schema({
  excelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'excelFiles',
    required: true
  },
  module: {
    type: String,
    enum: ["trucking", "shipchandler", "agency", "ptyss"],
    required: true
  },
  type: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["pendiente", "facturado", "anulado"],
    default: "pendiente"
  },
  totalValue: {
    type: Number,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Campo específico para sapCode (para consultas más eficientes)
  sapCode: {
    type: String,
    required: false,
    default: null
  },
  
  // Relaciones
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'clients',
    required: false
  },
  
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'invoices',
    required: false
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  }
}, {
  timestamps: true
});

// Índices
excelRecordSchema.index({ module: 1 });
excelRecordSchema.index({ status: 1 });
excelRecordSchema.index({ excelId: 1 });
excelRecordSchema.index({ invoiceId: 1 });
excelRecordSchema.index({ clientId: 1 });
excelRecordSchema.index({ createdBy: 1 });
excelRecordSchema.index({ createdAt: -1 });
excelRecordSchema.index({ sapCode: 1 });

export default excelRecordSchema;