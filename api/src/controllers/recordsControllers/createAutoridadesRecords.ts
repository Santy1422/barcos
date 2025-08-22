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

    console.log('createAutoridadesRecords - recordsData:', recordsData);
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

         // Verificar duplicados contra la base de datos existente
     const orderNumbers = recordsData.map(record => record.order);
     const existingOrders = await recordsAutoridades.find({ order: { $in: orderNumbers } }).select('order');
     const existingOrderNumbers = existingOrders.map(record => record.order);
     
     const duplicateOrders = orderNumbers.filter(order => existingOrderNumbers.includes(order));
     if (duplicateOrders.length > 0) {
       // Usar filter para obtener valores únicos en lugar de Set
       const uniqueDuplicates = duplicateOrders.filter((order, index) => duplicateOrders.indexOf(order) === index);
       console.log('createAutoridadesRecords - Orders duplicados encontrados en BD:', uniqueDuplicates);
       
       // Filtrar registros duplicados para continuar con los válidos
       const validRecords = recordsData.filter(record => !existingOrderNumbers.includes(record.order));
       console.log(`createAutoridadesRecords - ${validRecords.length} registros válidos (sin duplicados) de ${recordsData.length} total`);
       
       if (validRecords.length === 0) {
         console.log('createAutoridadesRecords - Todos los registros son duplicados, continuando con proceso vacío...');
         // Continuar con el proceso aunque no haya registros válidos
       }
       
       // Continuar con los registros válidos
       console.log('createAutoridadesRecords - Continuando con registros válidos...');
     }
    
         // Usar registros válidos (sin duplicados) si los hay, o todos si no hay duplicados
     const recordsToProcess = duplicateOrders.length > 0 ? 
       recordsData.filter(record => !existingOrderNumbers.includes(record.order)) : 
       recordsData;
     
     console.log('createAutoridadesRecords - Registros a procesar:', recordsToProcess.length);
     
     // Si no hay registros válidos para procesar, retornar respuesta con 0 creados
     if (recordsToProcess.length === 0) {
       console.log('createAutoridadesRecords - No hay registros válidos para procesar');
       const responseData: any = { 
         records: [], 
         count: 0,
         totalProcessed: recordsData.length
       };
       
       if (duplicateOrders.length > 0) {
         responseData.duplicates = {
           count: duplicateOrders.length,
           orders: duplicateOrders.filter((order, index) => duplicateOrders.indexOf(order) === index)
         };
         responseData.message = `Todos los registros eran duplicados. 0 registros nuevos fueron creados.`;
       }
       
       return response(res, 201, responseData);
     }
     
          // Preparar datos para inserción masiva
     const recordsToInsert = recordsToProcess.map(data => ({
       ...data,
       status: data.status || 'cargado',
       createdBy: userId
     }));
     
     console.log('createAutoridadesRecords - Iniciando inserción masiva de', recordsToInsert.length, 'registros');
     
     // Inserción masiva usando insertMany (mucho más rápido)
     let createdRecords;
     try {
       createdRecords = await recordsAutoridades.insertMany(recordsToInsert, { 
         ordered: false, // No fallar si hay errores individuales
         rawResult: false // Retornar documentos creados
       });
       console.log('createAutoridadesRecords - Inserción masiva exitosa:', createdRecords.length, 'registros creados');
     } catch (bulkError: any) {
       console.error('createAutoridadesRecords - Error en inserción masiva:', bulkError);
       
       // Si falla la inserción masiva, intentar inserción individual como fallback
       console.log('createAutoridadesRecords - Intentando inserción individual como fallback...');
       createdRecords = [];
       
       for (let i = 0; i < recordsToProcess.length; i++) {
         const data = recordsToProcess[i];
         try {
           const record = await recordsAutoridades.create({
             ...data,
             status: data.status || 'cargado',
             createdBy: userId
           });
           createdRecords.push(record);
         } catch (e) {
           console.error(`createAutoridadesRecords - Error creando registro ${i + 1}:`, e);
           // Continuar con el siguiente
         }
       }
     }
    
         console.log('createAutoridadesRecords - Total de registros creados:', createdRecords.length);
     
     // Preparar respuesta con información sobre duplicados si los hubo
     const responseData: any = { 
       records: createdRecords || [], 
       count: createdRecords ? createdRecords.length : 0,
       totalProcessed: recordsData.length
     };
     
     if (duplicateOrders.length > 0) {
       responseData.duplicates = {
         count: duplicateOrders.length,
         orders: duplicateOrders.filter((order, index) => duplicateOrders.indexOf(order) === index)
       };
       responseData.message = `Se procesaron ${createdRecords.length} registros válidos. ${duplicateOrders.length} registros duplicados fueron omitidos.`;
     }
     
     return response(res, 201, responseData);
  } catch (error) {
    return response(res, 500, { error: 'Error al crear registros de autoridades', details: error.message });
  }
}


