import mongoose from 'mongoose';

export interface IUploadJobError {
  row: number;
  message: string;
}

export interface IUploadJob extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  module: 'trucking' | 'ptyss' | 'agency' | 'shipchandler' | 'autoridades';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  excelId: mongoose.Types.ObjectId;
  totalRecords: number;
  processedRecords: number;
  createdRecords: number;
  duplicateRecords: number;
  errorRecords: number;
  uploadErrors: IUploadJobError[];
  duplicates: string[];
  result?: {
    success: boolean;
    message: string;
    recordIds?: string[];
  };
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const uploadJobSchema = new mongoose.Schema<IUploadJob>(
  {
    module: {
      type: String,
      required: true,
      enum: ['trucking', 'ptyss', 'agency', 'shipchandler', 'autoridades']
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true
    },
    userEmail: {
      type: String,
      required: true
    },
    excelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'excelFiles',
      required: true
    },
    totalRecords: {
      type: Number,
      default: 0
    },
    processedRecords: {
      type: Number,
      default: 0
    },
    createdRecords: {
      type: Number,
      default: 0
    },
    duplicateRecords: {
      type: Number,
      default: 0
    },
    errorRecords: {
      type: Number,
      default: 0
    },
    uploadErrors: [{
      row: Number,
      message: String
    }],
    duplicates: [String],
    result: {
      success: Boolean,
      message: String,
      recordIds: [String]
    },
    startedAt: Date,
    completedAt: Date
  },
  {
    timestamps: true
  }
);

// Índices para búsquedas rápidas
uploadJobSchema.index({ userId: 1, status: 1 });
uploadJobSchema.index({ status: 1, createdAt: -1 });
uploadJobSchema.index({ module: 1, status: 1 });

// TTL: eliminar jobs completados después de 24 horas
uploadJobSchema.index({ completedAt: 1 }, { expireAfterSeconds: 86400 });

export const UploadJob = mongoose.model<IUploadJob>('UploadJob', uploadJobSchema);
