import mongoose, { Schema, Document } from 'mongoose'

export interface ILocalService extends Document {
  name: string
  description: string
  module: "ptyss" | "trucking" | "agency" | "shipchandler" | "all"
  isActive: boolean
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

const localServiceSchema = new Schema<ILocalService>({
  name: {
    type: String,
    required: [true, 'El nombre del servicio es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
  },
  description: {
    type: String,
    required: [true, 'La descripción del servicio es obligatoria'],
    trim: true,
    maxlength: [500, 'La descripción no puede tener más de 500 caracteres']
  },
  module: {
    type: String,
    required: [true, 'El módulo es obligatorio'],
    enum: {
      values: ['ptyss', 'trucking', 'agency', 'shipchandler', 'all'],
      message: 'El módulo debe ser uno de: ptyss, trucking, agency, shipchandler, all'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Índices para mejorar el rendimiento de las consultas
localServiceSchema.index({ module: 1, isActive: 1 })
localServiceSchema.index({ name: 1 })
localServiceSchema.index({ createdAt: -1 })

// Método para obtener servicios por módulo
localServiceSchema.statics.findByModule = function(module: string) {
  return this.find({ module, isActive: true }).sort({ name: 1 })
}

// Método para obtener todos los servicios activos
localServiceSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ module: 1, name: 1 })
}

export const LocalService = mongoose.model<ILocalService>('LocalService', localServiceSchema) 