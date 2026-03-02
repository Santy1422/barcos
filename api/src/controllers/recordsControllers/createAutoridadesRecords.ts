import { Request, Response } from 'express';
import { recordsAutoridades } from '../../database';
import { response } from '../../utils';

// Extender la interfaz Request para incluir user
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

export async function createAutoridadesRecords(req: AuthenticatedRequest, res: Response) {
  try {
    console.log('createAutoridadesRecords - Body recibido:', req.body);

    const { recordsData } = req.body;
    const userId = req.user?._id;

    console.log('createAutoridadesRecords - recordsData:', recordsData?.length);
    console.log('createAutoridadesRecords - userId:', userId);

    if (!recordsData || !Array.isArray(recordsData) || !userId) {
      return response(res, 400, {
        error: 'Faltan datos requeridos: recordsData (array), usuario autenticado',
      });
    }

    // NOTA: Para gastos de autoridades NO se validan duplicados
    // Se permite subir el mismo order múltiples veces (re-facturación)
    console.log('createAutoridadesRecords - Total a procesar:', recordsData.length);
    console.log('  - SIN validación de duplicados (permitido en autoridades)');

    // Preparar datos para inserción - asegurar que campos requeridos tengan valor
    const recordsToInsert = recordsData.map(data => {
      const { clientId, ...restData } = data;

      return {
        ...restData,
        // Asegurar que campos requeridos tengan al menos un valor por defecto
        order: data.order || `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        container: data.container || 'N/A',
        blNumber: data.blNumber || 'N/A',
        clientId: clientId || null,
        status: data.status || 'cargado',
        createdBy: userId
      };
    });

    console.log('createAutoridadesRecords - Iniciando inserción de', recordsToInsert.length, 'registros');

    // Inserción masiva - TODOS los registros deben insertarse
    let createdRecords: any[] = [];
    let validationErrors: any[] = [];

    try {
      // Intentar inserción masiva primero
      createdRecords = await recordsAutoridades.insertMany(recordsToInsert, {
        ordered: false,
        rawResult: false
      });
      console.log('createAutoridadesRecords - Inserción masiva exitosa:', createdRecords.length);
    } catch (bulkError: any) {
      console.log('createAutoridadesRecords - Error en bulk insert:', bulkError.message);
      console.log('createAutoridadesRecords - Error code:', bulkError.code);
      console.log('createAutoridadesRecords - Write errors count:', bulkError.writeErrors?.length || 0);

      // Obtener registros que sí se insertaron (si hay)
      if (bulkError.insertedDocs && bulkError.insertedDocs.length > 0) {
        createdRecords = bulkError.insertedDocs;
        console.log('createAutoridadesRecords - Registros insertados parcialmente:', createdRecords.length);
      }

      // Guardar errores para diagnóstico
      if (bulkError.writeErrors) {
        validationErrors = bulkError.writeErrors.map((we: any) => ({
          index: we.index,
          message: we.errmsg || we.err?.errmsg || 'Error desconocido'
        }));
      }

      // Si no se insertaron registros, intentar uno por uno
      if (createdRecords.length === 0) {
        console.log('createAutoridadesRecords - Intentando inserción individual...');
        for (let i = 0; i < recordsToInsert.length; i++) {
          try {
            const record = await recordsAutoridades.create(recordsToInsert[i]);
            createdRecords.push(record);
          } catch (e: any) {
            console.error(`Error en registro ${i}:`, e.message);
            validationErrors.push({ index: i, message: e.message });
          }
        }
      }
    }

    console.log('createAutoridadesRecords - Total creados:', createdRecords.length);
    console.log('createAutoridadesRecords - Total errores:', validationErrors.length);

    // Preparar respuesta con información detallada
    const responseData: any = {
      records: createdRecords || [],
      count: createdRecords.length,
      totalProcessed: recordsData.length,
      errors: validationErrors.length > 0 ? {
        count: validationErrors.length,
        details: validationErrors.slice(0, 10) // Solo primeros 10 para no saturar
      } : null,
      message: createdRecords.length === recordsData.length
        ? `Se crearon ${createdRecords.length} registros exitosamente.`
        : `Se crearon ${createdRecords.length} de ${recordsData.length} registros. ${validationErrors.length} errores.`
    };

    return response(res, 201, responseData);
  } catch (error: any) {
    console.error('createAutoridadesRecords - Error fatal:', error);
    return response(res, 500, { error: 'Error al crear registros de autoridades', details: error.message });
  }
}


