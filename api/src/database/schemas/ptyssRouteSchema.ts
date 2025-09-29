import mongoose from 'mongoose';

const ptyssRouteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  containerType: {
    type: String,
    required: true
  },
  routeType: {
    type: String,
    enum: ['single', 'RT'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['FULL', 'EMPTY'],
    required: true,
    default: 'FULL'
  },
  cliente: {
    type: String,
    required: true
  },
  routeArea: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
// Índice único basado en campos clave para evitar duplicados de ruta
ptyssRouteSchema.index({ 
  name: 1, 
  from: 1, 
  to: 1, 
  containerType: 1, 
  routeType: 1, 
  status: 1, 
  cliente: 1, 
  routeArea: 1
}, { unique: true });

// Índices adicionales para consultas frecuentes
ptyssRouteSchema.index({ cliente: 1 });
ptyssRouteSchema.index({ routeArea: 1 });
ptyssRouteSchema.index({ from: 1, to: 1 });
ptyssRouteSchema.index({ containerType: 1 });
ptyssRouteSchema.index({ routeType: 1 });
ptyssRouteSchema.index({ status: 1 });

export default ptyssRouteSchema; 