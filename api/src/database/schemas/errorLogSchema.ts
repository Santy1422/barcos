import mongoose, { Schema, Document } from 'mongoose';

export interface IErrorLog extends Document {
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  module: string;
  action: string;
  message: string;
  stack?: string;
  userId?: string;
  userEmail?: string;
  requestData?: {
    method?: string;
    url?: string;
    body?: any;
    params?: any;
    query?: any;
  };
  metadata?: any;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

const errorLogSchema = new Schema<IErrorLog>({
  timestamp: { type: Date, default: Date.now, index: true },
  level: { type: String, enum: ['error', 'warning', 'info'], default: 'error', index: true },
  module: { type: String, required: true, index: true }, // trucking, ptyss, agency, etc.
  action: { type: String, required: true }, // createRecord, uploadExcel, etc.
  message: { type: String, required: true },
  stack: { type: String },
  userId: { type: String },
  userEmail: { type: String },
  requestData: {
    method: String,
    url: String,
    body: Schema.Types.Mixed,
    params: Schema.Types.Mixed,
    query: Schema.Types.Mixed
  },
  metadata: { type: Schema.Types.Mixed }, // Datos adicionales específicos del error
  resolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  resolvedBy: { type: String }
}, {
  timestamps: true,
  collection: 'errorlogs'
});

// Índice compuesto para búsquedas frecuentes
errorLogSchema.index({ module: 1, timestamp: -1 });
errorLogSchema.index({ level: 1, resolved: 1 });

// Auto-eliminar logs viejos (más de 30 días)
errorLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const ErrorLog = mongoose.model<IErrorLog>('ErrorLog', errorLogSchema);
