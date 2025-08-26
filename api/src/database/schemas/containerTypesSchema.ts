import mongoose from 'mongoose'

const containerTypesSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['A', 'B', 'DRY', 'N', 'REEFE', 'T'],
    default: 'DRY'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
})

// Índices para mejorar el rendimiento de las consultas
containerTypesSchema.index({ code: 1 })
containerTypesSchema.index({ category: 1 })
containerTypesSchema.index({ isActive: 1 })

export const ContainerType = mongoose.model('ContainerType', containerTypesSchema)
export default containerTypesSchema
