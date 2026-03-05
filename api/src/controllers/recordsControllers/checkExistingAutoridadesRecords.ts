import { Request, Response } from 'express';
import { recordsAutoridades } from '../../database';

/**
 * Verifica qué registros de autoridades ya existen en la base de datos
 * y retorna su estado actual (cargado, prefacturado, facturado)
 */
export async function checkExistingAutoridadesRecords(req: Request, res: Response) {
  try {
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Se requiere un array de números de order'
      });
    }

    // Buscar registros existentes
    const existingRecords = await recordsAutoridades.find({
      order: { $in: orders.map(o => String(o)) }
    }).select('order status container auth createdAt').lean();

    // Agrupar por estado
    const byStatus: { [key: string]: any[] } = {
      cargado: [],
      prefacturado: [],
      facturado: []
    };

    existingRecords.forEach(record => {
      const status = record.status || 'cargado';
      if (!byStatus[status]) byStatus[status] = [];
      byStatus[status].push({
        order: record.order,
        container: record.container,
        auth: record.auth,
        createdAt: record.createdAt
      });
    });

    // Encontrar cuáles son nuevos (no existen)
    const existingOrders = new Set(existingRecords.map(r => String(r.order)));
    const newOrders = orders.filter(o => !existingOrders.has(String(o)));

    return res.json({
      error: false,
      summary: {
        total: orders.length,
        existing: existingRecords.length,
        new: newOrders.length,
        cargado: byStatus.cargado.length,
        prefacturado: byStatus.prefacturado.length,
        facturado: byStatus.facturado.length
      },
      existingRecords: byStatus,
      newOrders
    });
  } catch (error: any) {
    console.error('[checkExistingAutoridadesRecords] Error:', error);
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
}
