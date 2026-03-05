import mongoose from 'mongoose';

const recordsAutoridadesSchema = new mongoose.Schema({
  order: { type: String, required: true }, // SIN unique - permite duplicados para re-facturación
  auth: { type: String, required: false, default: 'N/A' },
  nombreListado: { type: String, required: false, default: 'N/A' },
  no: { type: String, required: false, default: 'N/A' },
  container: { type: String, required: true },
  size: { type: String, required: false, default: 'N/A' },
  type: { type: String, required: false, default: 'N/A' },
  totalWeight: { type: Number, required: false, default: 0 },
  transport: { type: String, required: false, default: 'N/A' },
  fe: { type: String, required: false, default: 'N/A' },
  pol: { type: String, required: false, default: 'N/A' },
  pod: { type: String, required: false, default: 'N/A' },
  blNumber: { type: String, required: true },
  notf: { type: String, required: false, default: 'N/A' },
  seal: { type: String, required: false, default: 'N/A' },
  fromVslVoy: { type: String, required: false, default: 'N/A' },
  commodity: { type: String, required: false, default: 'N/A' },
  tramite: { type: String, required: false, default: 'N/A' },
  ruta: { type: String, required: false, default: 'N/A' },
  dateOfInvoice: { type: Date, required: false, default: Date.now },
  noInvoice: { type: String, required: false, default: 'N/A' },
  customer: { type: String, required: false, default: 'N/A' }, // Cliente al que facturar
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'clients', required: false }, // Referencia al cliente en la base de datos
  status: { type: String, enum: ['cargado', 'prefacturado', 'facturado'], default: 'cargado' },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'invoices', required: false },
  createdBy: { type: String, required: false, default: null },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Ensure both _id and id are available
      ret.id = ret._id.toString();
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Índices para mejorar el rendimiento de las consultas
recordsAutoridadesSchema.index({ blNumber: 1 });
recordsAutoridadesSchema.index({ customer: 1 });
recordsAutoridadesSchema.index({ clientId: 1 });
recordsAutoridadesSchema.index({ status: 1 });
recordsAutoridadesSchema.index({ invoiceId: 1 });
recordsAutoridadesSchema.index({ createdAt: -1 });

export default recordsAutoridadesSchema;

