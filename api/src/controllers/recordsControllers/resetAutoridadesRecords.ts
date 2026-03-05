import { Request, Response } from 'express';
import { recordsAutoridades } from '../../database';

/**
 * Resetea registros de autoridades existentes a status "cargado"
 * para que puedan volver a ser facturados
 */
export async function resetAutoridadesRecords(req: Request, res: Response) {
  try {
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Se requiere un array de números de order'
      });
    }

    // Reset all matching records to "cargado"
    const result = await recordsAutoridades.updateMany(
      { order: { $in: orders.map(o => String(o)) } },
      { $set: { status: 'cargado' } }
    );

    console.log(`[resetAutoridadesRecords] Reset ${result.modifiedCount} records to cargado`);

    return res.json({
      error: false,
      message: `Se resetearon ${result.modifiedCount} registros a estado "cargado"`,
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    console.error('[resetAutoridadesRecords] Error:', error);
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
}
