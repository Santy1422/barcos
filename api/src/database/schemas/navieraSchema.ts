import mongoose, { Schema, Document } from 'mongoose'

export interface INaviera extends Document {
  name: string
  code: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy?: string
}

const navieraSchema = new Schema<INaviera>({
  name: {
    type: String,
    required: [true, 'El nombre de la naviera es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
  },
  code: {
    type: String,
    required: [true, 'El código de la naviera es obligatorio'],
    trim: true,
    uppercase: true,
    maxlength: [20, 'El código no puede tener más de 20 caracteres'],
    unique: true
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
navieraSchema.index({ code: 1 })
navieraSchema.index({ isActive: 1 })

export const Naviera = mongoose.model<INaviera>('Naviera', navieraSchema) 