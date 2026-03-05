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
    enum: ["pendiente", "en_progreso", "completado", "prefacturado", "facturado", "anulado", "cancelado"],
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
  
  // Campo específico para containerConsecutive (para consultas más eficientes)
  containerConsecutive: {
    type: String,
    required: false,
    default: null
  },

  // Numero de orden consecutivo (formato: ORD-XXXXXX)
  // Sirve como referencia tipo PO para el registro
  // NOTA: NO usar default: null porque sparse solo ignora undefined, no null
  orderNumber: {
    type: String,
    required: false,
    unique: true,
    sparse: true
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
excelRecordSchema.index({ containerConsecutive: 1 });
excelRecordSchema.index({ orderNumber: 1 });
// Índice único compuesto para evitar duplicados de containerConsecutive en el mismo módulo
excelRecordSchema.index({ module: 1, containerConsecutive: 1 }, { unique: true, sparse: true });

export default excelRecordSchema;