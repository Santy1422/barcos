import { Request, Response } from 'express';
import { recordsAutoridades } from '../../database';
import { response } from '../../utils';

interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    id: string;
    mongoId: string;
    email: string;
    name: string;
    role: string;
    modules: string[];
    isActive: boolean;
  };
}

export async function bulkUpdateAutoridadesRecords(req: AuthenticatedRequest, res: Response) {
  try {
    const { recordIds, status, invoiceId } = req.body;

    console.log(`🔍 Bulk update autoridades: ${recordIds?.length} registros a status=${status}, invoiceId=${invoiceId}`);

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return response(res, 400, { error: 'recordIds es requerido y debe ser un array no vacío' });
    }

    if (!status) {
      return response(res, 400, { error: 'status es requerido' });
    }

    // Actualización masiva usando updateMany
    const result = await recordsAutoridades.updateMany(
      { _id: { $in: recordIds } },
      {
        $set: {
          status: status,
          invoiceId: invoiceId || null,
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Bulk update autoridades completado: ${result.modifiedCount} de ${recordIds.length} registros actualizados`);

    return response(res, 200, {
      success: true,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      recordIds: recordIds
    });
  } catch (error: any) {
    console.error('❌ Error en bulk update autoridades:', error);
    return response(res, 500, {
      error: 'Error al actualizar registros de autoridades',
      details: error.message
    });
  }
}
