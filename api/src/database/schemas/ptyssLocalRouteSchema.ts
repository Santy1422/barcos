import mongoose from 'mongoose';

const ptyssLocalRouteSchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: true,
    // Removido enum para permitir nombres dinámicos
    validate: {
      validator: function(v: string) {
        // Validar que sigue el patrón "esquema rutas X" o nombres personalizados
        return v && v.trim().length > 0;
      },
      message: 'El nombre del esquema es requerido'
    }
  },
  // Campo para asociar con cliente real del sistema
  realClientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'clients',
    required: false // Opcional para mantener compatibilidad con datos existentes
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

// Índice para buscar por cliente real
ptyssLocalRouteSchema.index({ realClientId: 1 });

// Índice para búsquedas por nombre de esquema
ptyssLocalRouteSchema.index({ clientName: 1 });

export default ptyssLocalRouteSchema; 