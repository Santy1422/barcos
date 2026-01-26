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
    console.log('createAutoridadesRecords - Headers:', req.headers);

    const { recordsData } = req.body;
    const userId = req.user?._id;

    console.log('createAutoridadesRecords - recordsData:', recordsData?.length);
    console.log('createAutoridadesRecords - userId:', userId);

    if (!recordsData || !Array.isArray(recordsData) || !userId) {
      console.log('createAutoridadesRecords - Validación fallida:', {
        hasRecordsData: !!recordsData,
        isArray: Array.isArray(recordsData),
        hasUserId: !!userId
      });
      return response(res, 400, {
        error: 'Faltan datos requeridos: recordsData (array), usuario autenticado',
      });
    }

    // 1. Verificar duplicados DENTRO del mismo batch
    const orderNumbers = recordsData.map(record => record.order).filter(Boolean);
    const duplicatesInBatch: string[] = [];
    const seenInBatch = new Set<string>();

    orderNumbers.forEach(order => {
      if (seenInBatch.has(order)) {
        duplicatesInBatch.push(order);
      } else {
        seenInBatch.add(order);
      }
    });

    if (duplicatesInBatch.length > 0) {
      console.log('createAutoridadesRecords - Duplicados encontrados DENTRO del batch:', duplicatesInBatch.length);
    }

    // 2. Verificar duplicados contra la base de datos existente
    const existingOrders = await recordsAutoridades.find({ order: { $in: orderNumbers } }).select('order');
    const existingOrderNumbers = existingOrders.map(record => record.order);

    const duplicatesInDB = orderNumbers.filter(order => existingOrderNumbers.includes(order));
    if (duplicatesInDB.length > 0) {
      console.log('createAutoridadesRecords - Duplicados encontrados en BD:', duplicatesInDB.length);
    }

    // Combinar todos los duplicados
    const allDuplicates = Array.from(new Set([...duplicatesInDB, ...duplicatesInBatch]));

    // Filtrar registros: excluir duplicados de DB y mantener solo primera aparición en batch
    const processedOrders = new Set<string>();
    const recordsToProcess = recordsData.filter(record => {
      const order = record.order;
      if (!order) return true; // Si no tiene order, procesarlo

      // Excluir si ya existe en DB
      if (existingOrderNumbers.includes(order)) return false;

      // Excluir si ya procesamos este order en el batch
      if (processedOrders.has(order)) return false;

      // Marcar como procesado
      processedOrders.add(order);
      return true;
    });

    console.log('createAutoridadesRecords - Registros a procesar:', recordsToProcess.length);
    console.log('  - Total original:', recordsData.length);
    console.log('  - Duplicados en DB:', duplicatesInDB.length);
    console.log('  - Duplicados en batch:', duplicatesInBatch.length);

    // Si no hay registros válidos para procesar, retornar respuesta con 0 creados
    if (recordsToProcess.length === 0) {
      console.log('createAutoridadesRecords - No hay registros válidos para procesar');
      const responseData: any = {
        records: [],
        count: 0,
        totalProcessed: recordsData.length
      };

      if (allDuplicates.length > 0) {
        responseData.duplicates = {
          count: allDuplicates.length,
          orders: allDuplicates.filter((order, index) => allDuplicates.indexOf(order) === index),
          inDatabase: duplicatesInDB.length,
          inBatch: duplicatesInBatch.length
        };
        responseData.message = `Todos los registros eran duplicados (${duplicatesInDB.length} en DB, ${duplicatesInBatch.length} en batch). 0 registros nuevos fueron creados.`;
      }

      return response(res, 201, responseData);
    }
     
          // Preparar datos para inserción masiva
     const recordsToInsert = recordsToProcess.map(data => {
       // Extraer clientId si viene del frontend
       const { clientId, ...restData } = data;
       
       return {
         ...restData,
         clientId: clientId || null, // Guardar clientId si existe
         status: data.status || 'cargado',
         createdBy: userId
       };
     });
     
     console.log('createAutoridadesRecords - Iniciando inserción masiva de', recordsToInsert.length, 'registros');
     console.log('createAutoridadesRecords - Primer registro de ejemplo:', JSON.stringify(recordsToInsert[0], null, 2));
     
    // Inserción masiva usando insertMany (mucho más rápido)
    let createdRecords: any[] = [];
    try {
      createdRecords = await recordsAutoridades.insertMany(recordsToInsert, {
        ordered: false, // No fallar si hay errores individuales
        rawResult: false // Retornar documentos creados
      });
      console.log('createAutoridadesRecords - Inserción masiva exitosa:', createdRecords.length, 'registros creados');
    } catch (bulkError: any) {
      // Si es error de duplicados parciales, algunos registros pueden haberse insertado
      if (bulkError.code === 11000 || bulkError.writeErrors) {
        // Obtener registros que sí se insertaron
        if (bulkError.insertedDocs) {
          createdRecords = bulkError.insertedDocs;
          console.log('createAutoridadesRecords - Inserción parcial:', createdRecords.length, 'registros creados,', bulkError.writeErrors?.length || 0, 'duplicados omitidos');
        } else {
          // Fallback: inserción individual
          console.log('createAutoridadesRecords - Intentando inserción individual como fallback...');
          createdRecords = [];

          for (let i = 0; i < recordsToInsert.length; i++) {
            const data = recordsToInsert[i];
            try {
              const record = await recordsAutoridades.create(data);
              createdRecords.push(record);
            } catch (e: any) {
              // Manejar error de duplicado silenciosamente
              if (e.code === 11000) {
                const dupKey = e.keyValue?.order;
                if (dupKey && !allDuplicates.includes(dupKey)) {
                  allDuplicates.push(dupKey);
                }
                console.warn(`createAutoridadesRecords - Registro ${i + 1} omitido - duplicado:`, dupKey);
              } else {
                console.error(`createAutoridadesRecords - Error creando registro ${i + 1}:`, e.message);
              }
              // Continuar con el siguiente
            }
          }
        }
      } else {
        console.error('createAutoridadesRecords - Error en inserción masiva:', bulkError.message);
        throw bulkError;
      }
    }
    
    console.log('createAutoridadesRecords - Total de registros creados:', createdRecords.length);

    // Preparar respuesta con información sobre duplicados si los hubo
    const responseData: any = {
      records: createdRecords || [],
      count: createdRecords ? createdRecords.length : 0,
      totalProcessed: recordsData.length
    };

    if (allDuplicates.length > 0) {
      responseData.duplicates = {
        count: allDuplicates.length,
        orders: allDuplicates.filter((order, index) => allDuplicates.indexOf(order) === index)
      };
      responseData.message = `Se crearon ${createdRecords.length} registros. ${allDuplicates.length} duplicados fueron omitidos.`;
    }

    return response(res, 201, responseData);
  } catch (error) {
    return response(res, 500, { error: 'Error al crear registros de autoridades', details: error.message });
  }
}


