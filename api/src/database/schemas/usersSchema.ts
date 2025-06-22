import mongoose from 'mongoose';
const { v4: uuidv4 } = require('uuid');

const usersSchema = new mongoose.Schema({
  // Campos existentes del sistema anterior

  
  // Campos principales del usuario - ROLES CORREGIDOS SEGÚN FRONTEND
  role: {
    type: String,
    enum: ["administrador", "operaciones", "facturacion"],
    default: "administrador"
  },
  username: {
    type: String,
    unique: true,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    default: ""
  },
  
  // Configuraciones específicas del sistema de facturación
  modules: [{
    type: String,
    enum: ["trucking", "shipchandler", "agency"]
  }],
  
  company: {
    name: {
      type: String,
      required: false
    },
    ruc: {
      type: String,
      required: false
    },
    address: {
      type: String,
      required: false
    },
    logo: {
      type: String,
      required: false
    }
  },
  
  // Configuraciones de usuario
  preferences: {
    language: {
      type: String,
      enum: ["es", "en"],
      default: "es"
    },
    currency: {
      type: String,
      enum: ["USD", "PAB"],
      default: "USD"
    },
    timezone: {
      type: String,
      default: "America/Panama"
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  
  
  // Estado del usuario
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
usersSchema.index({ email: 1 });
usersSchema.index({ username: 1 });
usersSchema.index({ role: 1 });
usersSchema.index({ isActive: 1 });
usersSchema.index({ modules: 1 });
usersSchema.index({ 'company.ruc': 1 });
usersSchema.index({ createdAt: -1 });

// Métodos virtuales
usersSchema.virtual('displayName').get(function() {
  return this.fullName || `${this.name} ${this.lastName}`;
});

export default usersSchema;
