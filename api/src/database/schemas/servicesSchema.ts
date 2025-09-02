import mongoose, { Schema, Document } from 'mongoose'

export interface IService extends Document {
  name: string
  description: string
  price: number
  module: string
  isActive: boolean
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

const servicesSchema = new Schema<IService>({
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
  price: {
    type: Number,
    required: [true, 'El precio del servicio es obligatorio'],
    min: [0, 'El precio no puede ser negativo'],
    default: 0
  },
  module: {
    type: String,
    enum: ['ptyss', 'trucking', 'agency', 'shipchandler', 'all'],
    default: 'ptyss'
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
servicesSchema.index({ module: 1 })
servicesSchema.index({ isActive: 1 })
servicesSchema.index({ name: 1 })

export const Service = mongoose.model<IService>('Service', servicesSchema) 