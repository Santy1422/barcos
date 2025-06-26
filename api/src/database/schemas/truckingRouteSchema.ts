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
    enum: ['normal', 'refrigerated'],
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

export default truckingRouteSchema; 