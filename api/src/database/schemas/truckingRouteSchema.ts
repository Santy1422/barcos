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
    enum: ['dry', 'reefer', 'mty', 'fb'],
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
    enum: ['Full', 'Empty'],
    required: true,
    default: 'Full'
  }
}, {
  timestamps: true
});

// Índice compuesto para validar duplicados: nombre + tipo de contenedor + tipo de ruta + status
// Esto permite tener rutas con el mismo nombre pero diferentes tipos y estados
truckingRouteSchema.index({ name: 1, containerType: 1, routeType: 1, status: 1 }, { unique: true });

export default truckingRouteSchema; 