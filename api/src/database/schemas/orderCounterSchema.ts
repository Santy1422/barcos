import mongoose from 'mongoose';

/**
 * Schema para mantener contadores de numeros de orden consecutivos
 * Se usa un documento por modulo para mantener el siguiente numero disponible
 */
const orderCounterSchema = new mongoose.Schema({
  module: {
    type: String,
    enum: ["trucking", "shipchandler", "agency", "ptyss"],
    required: true,
    unique: true
  },
  prefix: {
    type: String,
    required: true,
    default: "ORD"
  },
  currentNumber: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true
});

// Crear el modelo
export const OrderCounter = mongoose.model('orderCounter', orderCounterSchema);

/**
 * Genera el siguiente numero de orden consecutivo para un modulo
 * Formato: ORD-XXXXXX (6 digitos con padding de ceros)
 * @param module - El modulo para el cual generar el numero de orden
 * @returns El numero de orden generado en formato ORD-XXXXXX
 */
export async function getNextOrderNumber(module: string): Promise<string> {
  // Usar findOneAndUpdate con upsert para garantizar atomicidad
  const counter = await OrderCounter.findOneAndUpdate(
    { module },
    {
      $inc: { currentNumber: 1 },
      $setOnInsert: { prefix: 'ORD' }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  // Formatear el numero con 6 digitos y padding de ceros
  const paddedNumber = String(counter.currentNumber).padStart(6, '0');
  return `ORD-${paddedNumber}`;
}

export default orderCounterSchema;
