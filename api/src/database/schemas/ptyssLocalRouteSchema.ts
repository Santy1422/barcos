import mongoose from 'mongoose';

const ptyssLocalRouteSchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: true,
    enum: ['cliente 1', 'cliente 2', 'cliente 3', 'cliente 4', 'cliente 5']
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// Índice compuesto para validar duplicados: cliente + origen + destino
ptyssLocalRouteSchema.index({ clientName: 1, from: 1, to: 1 }, { unique: true });

export default ptyssLocalRouteSchema; 