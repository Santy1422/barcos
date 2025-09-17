import mongoose from 'mongoose';

const truckingRouteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  origin: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  containerType: {
    type: String,
    required: true
  },
  routeType: {
    type: String,
    enum: ['SINGLE', 'RT'],
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
  },
  sizeContenedor: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
// Índice único basado en campos clave (sin precio) para evitar duplicados de ruta
truckingRouteSchema.index({ 
  name: 1, 
  origin: 1, 
  destination: 1, 
  containerType: 1, 
  routeType: 1, 
  status: 1, 
  cliente: 1, 
  routeArea: 1, 
  sizeContenedor: 1
}, { unique: true });

// Índices adicionales para consultas frecuentes
truckingRouteSchema.index({ cliente: 1 });
truckingRouteSchema.index({ routeArea: 1 });
truckingRouteSchema.index({ sizeContenedor: 1 });
truckingRouteSchema.index({ origin: 1, destination: 1 });
truckingRouteSchema.index({ containerType: 1 });
truckingRouteSchema.index({ routeType: 1 });
truckingRouteSchema.index({ status: 1 });

export default truckingRouteSchema; 