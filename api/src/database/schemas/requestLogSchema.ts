import mongoose, { Schema, Document } from 'mongoose';

export interface IRequestLog extends Document {
  timestamp: Date;
  source: 'backend' | 'frontend'; // Origen del log
  method: string;
  url: string;
  path: string;
  statusCode: number;
  responseTime: number; // en milisegundos
  userId?: string;
  userEmail?: string;
  userName?: string;
  ip: string;
  userAgent?: string;
  requestHeaders?: any;
  requestBody?: any;
  requestQuery?: any;
  requestParams?: any;
  responseBody?: any;
  responseHeaders?: any;
  error?: {
    message: string;
    stack?: string;
    code?: string;
    name?: string;
  };
  module?: string; // trucking, agency, ptyss, etc.
  action?: string; // acción específica: login, upload, create, delete, etc.
  entityId?: string; // ID de la entidad afectada (invoiceId, recordId, etc.)
  entityType?: string; // tipo de entidad: invoice, record, client, etc.
  // Campos específicos para frontend
  componentName?: string;
  pageUrl?: string;
  browserInfo?: {
    name?: string;
    version?: string;
    os?: string;
    device?: string;
  };
}

const requestLogSchema = new Schema<IRequestLog>({
  timestamp: { type: Date, default: Date.now, index: true },
  source: { type: String, enum: ['backend', 'frontend'], default: 'backend', index: true },
  method: { type: String, required: true, index: true },
  url: { type: String, required: true },
  path: { type: String, required: true, index: true },
  statusCode: { type: Number, required: true, index: true },
  responseTime: { type: Number, default: 0 },
  userId: { type: String, index: true },
  userEmail: { type: String },
  userName: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  requestHeaders: { type: Schema.Types.Mixed },
  requestBody: { type: Schema.Types.Mixed },
  requestQuery: { type: Schema.Types.Mixed },
  requestParams: { type: Schema.Types.Mixed },
  responseBody: { type: Schema.Types.Mixed },
  responseHeaders: { type: Schema.Types.Mixed },
  error: {
    message: String,
    stack: String,
    code: String,
    name: String
  },
  module: { type: String, index: true },
  action: { type: String, index: true },
  entityId: { type: String },
  entityType: { type: String },
  // Campos para frontend
  componentName: { type: String },
  pageUrl: { type: String },
  browserInfo: {
    name: String,
    version: String,
    os: String,
    device: String
  }
}, {
  timestamps: true,
  collection: 'requestlogs'
});

// Indices para consultas frecuentes
requestLogSchema.index({ timestamp: -1 });
requestLogSchema.index({ source: 1, timestamp: -1 });
requestLogSchema.index({ method: 1, path: 1 });
requestLogSchema.index({ statusCode: 1, timestamp: -1 });
requestLogSchema.index({ userId: 1, timestamp: -1 });
requestLogSchema.index({ module: 1, timestamp: -1 });
requestLogSchema.index({ action: 1, timestamp: -1 });
requestLogSchema.index({ 'error.message': 1 });

// Auto-eliminar logs viejos (más de 14 días)
requestLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 });

export const RequestLog = mongoose.model<IRequestLog>('RequestLog', requestLogSchema);
