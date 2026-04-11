import mongoose from 'mongoose';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

/**
 * Periodo visible en la orden local PTYSS (ej. FEB26 = febrero 2026).
 * Usa zona horaria América/Panamá.
 */
export function getPTYSSLocalOrderPeriodKey(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Panama',
    year: 'numeric',
    month: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  const yearStr = parts.find((p) => p.type === 'year')?.value;
  const monthStr = parts.find((p) => p.type === 'month')?.value;
  const year = yearStr ? parseInt(yearStr, 10) : date.getUTCFullYear();
  const month = monthStr ? parseInt(monthStr, 10) : date.getUTCMonth() + 1;
  const yy = String(year).slice(-2);
  return `${MONTHS[month - 1]}${yy}`;
}

const ptyssLocalDisplayOrderCounterSchema = new mongoose.Schema(
  {
    periodKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

export const PtyssLocalDisplayOrderCounter = mongoose.model(
  'ptyssLocalDisplayOrderCounter',
  ptyssLocalDisplayOrderCounterSchema
);

/**
 * Siguiente código de orden local para el período actual (ej. FEB26-061).
 * Atómico vía findOneAndUpdate + $inc (seguro con varios usuarios / procesos).
 */
export async function getNextPTYSSLocalDisplayOrder(): Promise<string> {
  const periodKey = getPTYSSLocalOrderPeriodKey();
  const doc = await PtyssLocalDisplayOrderCounter.findOneAndUpdate(
    { periodKey },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const n = doc.sequence;
  return `${periodKey}-${String(n).padStart(3, '0')}`;
}

/**
 * Si es registro local PTYSS y no viene orden, asigna la siguiente del contador.
 */
export async function ensurePTYSSLocalDisplayOrderOnData(
  data: Record<string, any>
): Promise<Record<string, any>> {
  const copy = { ...data };
  const isTrasiego =
    copy.containerConsecutive || copy.leg || copy.moveType || copy.associate;
  if (!isTrasiego) {
    const o = typeof copy.order === 'string' ? copy.order.trim() : '';
    if (!o) {
      copy.order = await getNextPTYSSLocalDisplayOrder();
    }
  }
  return copy;
}

export default ptyssLocalDisplayOrderCounterSchema;
