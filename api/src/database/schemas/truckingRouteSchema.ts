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
    enum: ['dry', 'reefer'],
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
// Esto permite tener rutas con el mismo nombre pero diferentes tipos
truckingRouteSchema.index({ name: 1, containerType: 1, routeType: 1 }, { unique: true });

export default truckingRouteSchema; 