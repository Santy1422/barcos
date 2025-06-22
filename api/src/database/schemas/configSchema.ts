import mongoose from 'mongoose';

// Schema para conductores
const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  license: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: true
  }
}, { _id: false });

// Schema para vehículos
const vehicleSchema = new mongoose.Schema({
  plate: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  capacity: {
    type: String,
    required: true
  }
}, { _id: false });

// Schema para rutas
const routeSchema = new mongoose.Schema({
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
  distance: {
    type: Number,
    required: true
  }
}, { _id: false });

// Schema para campos personalizados
const customFieldSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ["text", "number", "date", "select"],
    required: true
  },
  options: [{
    type: String
  }],
  module: {
    type: String,
    enum: ["trucking", "agency", "shipchandler"],
    required: true
  }
}, { _id: false });

// Schema principal de configuración
const configSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  drivers: [driverSchema],
  vehicles: [vehicleSchema],
  routes: [routeSchema],
  customFields: [customFieldSchema]
}, {
  timestamps: true
});

// Índices
configSchema.index({ userId: 1 });

export default configSchema;