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
  }
}, {
  timestamps: true
});

// Índice compuesto para validar duplicados: nombre + tipo de contenedor + tipo de ruta
ptyssRouteSchema.index({ name: 1, containerType: 1, routeType: 1 }, { unique: true });

export default ptyssRouteSchema; 