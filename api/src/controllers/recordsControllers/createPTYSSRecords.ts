import { records, getNextOrderNumber } from "../../database";
import { response } from "../../utils";
import mongoose from "mongoose";

const serializePTYSSRecord = (record: any) => {
  const recordObj = record.toObject ? record.toObject() : { ...record };
  return {
    ...recordObj,
    _id: recordObj._id?.toString?.() ?? String(recordObj._id),
    excelId: recordObj.excelId?.toString?.() ?? recordObj.excelId,
    createdBy: recordObj.createdBy?.toString?.() ?? recordObj.createdBy,
    clientId: recordObj.clientId?.toString?.() ?? recordObj.clientId,
    invoiceId: recordObj.invoiceId?.toString?.() ?? recordObj.invoiceId
  };
};

interface PTYSSRecordData {
  clientId: string;
  order: string;
  container: string;
  naviera: string;
  from: string;
  to: string;
  operationType: string;
  containerSize: string;
  containerType: string;
  estadia: string;
  genset: string;
  retencion: string;
  pesaje: string;
  ti: string;
  matriculaCamion: string;
  conductor: string;
  numeroChasisPlaca: string;
  moveDate: string;
  notes: string;
  totalValue: number;
}

export default async (req, res) => {
  try {
    console.log("=== CREATE PTYSS RECORDS ===");
    console.log("Body recibido:", req.body);
    console.log("Usuario autenticado:", req.user);
    console.log("Headers:", req.headers);

    const { excelId, recordsData } = req.body;
    const userId = req.user?._id;

    console.log("excelId:", excelId);
    console.log("recordsData length:", recordsData?.length);
    console.log("userId:", userId);

    // Convertir excelId a ObjectId válido
    let validExcelId;
    try {
      validExcelId = new mongoose.Types.ObjectId(excelId);
      console.log("excelId convertido a ObjectId:", validExcelId);
    } catch (error) {
      console.error("❌ Error convirtiendo excelId a ObjectId:", error);
      return response(res, 400, {
        error: "excelId inválido - debe ser un ObjectId válido"
      });
    }

    // Validar que los datos requeridos estén presentes
    if (!validExcelId || !recordsData || !Array.isArray(recordsData) || !userId) {
      console.log("❌ Validación fallida:");
      console.log("  - validExcelId:", !!validExcelId);
      console.log("  - recordsData:", !!recordsData);
      console.log("  - Array.isArray(recordsData):", Array.isArray(recordsData));
      console.log("  - userId:", !!userId);

      return response(res, 400, {
        error: "Faltan datos requeridos: excelId, recordsData (array), usuario autenticado"
      });
    }

    // Helper para obtener containerConsecutive de un registro
    const getContainerConsecutive = (data: any): string | null => {
      const isTrasiego = data?.containerConsecutive || data?.leg || data?.moveType || data?.associate;
      return isTrasiego
        ? (data?.containerConsecutive || null)
        : (data?.order || null);
    };

    // Verificar duplicados por containerConsecutive en el módulo ptyss
    // Para registros de trasiego: usar containerConsecutive
    // Para registros locales: usar order como containerConsecutive
    const containerConsecutives = recordsData.map(record => {
      return getContainerConsecutive(record.data);
    }).filter(Boolean); // Solo incluir valores truthy (no null, undefined, o vacío)

    console.log("🔍 Verificando duplicados por containerConsecutive (o order para locales)...");
    console.log("ContainerConsecutives a verificar:", containerConsecutives.length);

    let duplicateContainerConsecutives: string[] = [];
    let duplicatesInBatch: string[] = [];

    // 1. Verificar duplicados DENTRO del mismo batch
    const seenInBatch = new Set<string>();
    containerConsecutives.forEach(cc => {
      if (seenInBatch.has(cc)) {
        duplicatesInBatch.push(cc);
      } else {
        seenInBatch.add(cc);
      }
    });

    if (duplicatesInBatch.length > 0) {
      console.log("⚠️ Duplicados encontrados DENTRO del mismo batch:", duplicatesInBatch.length);
    }

    // 2. Duplicados en BD: solo registros activos (deletedAt null). Soft-deleted permite recuperación.
    const activeDuplicateCCs = new Set<string>();
    const softDeletedByCc = new Map<string, any>();

    if (containerConsecutives.length > 0) {
      const existingRecords = await records.find({
        module: 'ptyss',
        containerConsecutive: { $in: containerConsecutives }
      });

      for (const r of existingRecords) {
        const ccVal = r.containerConsecutive;
        if (!ccVal) continue;
        if (r.deletedAt == null) {
          activeDuplicateCCs.add(ccVal);
        } else if (!softDeletedByCc.has(ccVal)) {
          softDeletedByCc.set(ccVal, r);
        }
      }

      duplicateContainerConsecutives = containerConsecutives.filter(cc =>
        activeDuplicateCCs.has(cc)
      );

      console.log("📊 Resultado de verificación de duplicados:");
      console.log("  - Registros existentes encontrados:", existingRecords.length);
      console.log("  - Claves duplicadas activas en DB:", activeDuplicateCCs.size);
      console.log("  - Claves ocupadas por soft-deleted (recuperables):", softDeletedByCc.size);
    } else {
      console.log("📊 No hay containerConsecutives para verificar");
    }

    const seenRecoverCc = new Set<string>();
    const softDeletedRecoverableList: Array<{ containerConsecutive: string; record: any }> = [];
    for (const record of recordsData) {
      const cc = getContainerConsecutive(record.data || {});
      if (!cc || !softDeletedByCc.has(cc) || activeDuplicateCCs.has(cc)) continue;
      if (seenRecoverCc.has(cc)) continue;
      seenRecoverCc.add(cc);
      softDeletedRecoverableList.push({
        containerConsecutive: cc,
        record: serializePTYSSRecord(softDeletedByCc.get(cc))
      });
    }

    const allDuplicates = Array.from(new Set([...duplicateContainerConsecutives, ...duplicatesInBatch]));

    const processedCCs = new Set<string>();
    const recordsToProcess = recordsData.filter(record => {
      const data = record.data || {};
      const cc = getContainerConsecutive(data);

      if (!cc) return true;

      if (activeDuplicateCCs.has(cc)) return false;

      if (softDeletedByCc.has(cc)) return false;

      if (processedCCs.has(cc)) return false;

      processedCCs.add(cc);
      return true;
    });

    console.log("📝 Registros a procesar después de filtrar duplicados:");
    console.log("  - Total original:", recordsData.length);
    console.log("  - Duplicados activos en DB:", duplicateContainerConsecutives.length);
    console.log("  - Duplicados en batch:", duplicatesInBatch.length);
    console.log("  - Recuperables (soft-deleted):", softDeletedRecoverableList.length);
    console.log("  - Registros válidos para procesar:", recordsToProcess.length);

    if (recordsToProcess.length === 0) {
      console.log('createPTYSSRecords - No hay registros válidos para procesar');
      const responseData: any = {
        records: [],
        count: 0,
        totalProcessed: recordsData.length
      };

      if (softDeletedRecoverableList.length > 0) {
        responseData.softDeletedRecoverableList = softDeletedRecoverableList;
        responseData.softDeletedRecoverable = softDeletedRecoverableList[0];
        responseData.message =
          'Ya existe un registro con esa orden/clave pero fue eliminado. Se pueden cargar sus datos para recuperarlo al guardar.';
      }

      if (allDuplicates.length > 0) {
        responseData.duplicates = {
          count: allDuplicates.length,
          containerConsecutives: Array.from(new Set(allDuplicates)),
          inDatabase: duplicateContainerConsecutives.length,
          inBatch: duplicatesInBatch.length
        };
        if (!responseData.message) {
          responseData.message = `Todos los registros eran duplicados (${duplicateContainerConsecutives.length} en DB, ${duplicatesInBatch.length} en batch). 0 registros nuevos fueron creados.`;
        } else {
          responseData.message += ` Además hay ${duplicateContainerConsecutives.length} duplicado(s) activo(s) en la base de datos.`;
        }
      }

      return response(res, 201, responseData);
    }
    
    const createdRecords = [];
    
    console.log("🔄 Iniciando creación de registros PTYSS...");
    
    for (let i = 0; i < recordsToProcess.length; i++) {
      const recordData = recordsToProcess[i];
      const { data, totalValue } = recordData;
      
      console.log(`📝 Procesando registro PTYSS ${i + 1}/${recordsToProcess.length}:`);
      console.log(`  - totalValue: ${totalValue}`);
      console.log(`  - data keys: ${Object.keys(data).join(', ')}`);
      console.log(`  - container: ${data.container || 'no encontrado'}`);
      console.log(`  - order: ${data.order || 'no encontrado'}`);
      
      // Validar que cada registro tenga los datos necesarios
      if (!data || totalValue === undefined) {
        console.warn(`⚠️ Registro PTYSS ${i + 1} inválido saltado:`, recordData);
        continue;
      }
      
      try {
        console.log(`💾 Guardando registro PTYSS ${i + 1} en MongoDB...`);

        // Determinar si es un registro de trasiego basándose en los campos del Excel
        // Los registros de trasiego tienen campos específicos como containerConsecutive, leg, moveType, associate
        const isTrasiego = data.containerConsecutive || data.leg || data.moveType || data.associate;
        const recordStatus = isTrasiego ? "completado" : "pendiente";

        // Para registros locales, usar 'order' como containerConsecutive para evitar problemas con el índice único
        // Para registros de trasiego, usar el containerConsecutive original
        const containerConsecutive = isTrasiego
          ? (data.containerConsecutive || null)
          : (data.order || null);

        const clientId = data.clientId || null;

        console.log(`  - Es trasiego: ${isTrasiego ? 'SÍ' : 'NO'}`);
        console.log(`  - containerConsecutive: ${containerConsecutive} (${isTrasiego ? 'original' : 'order'})`);
        console.log(`  - order: ${data.order || 'N/A'}`);
        console.log(`  - Estado asignado: ${recordStatus}`);
        console.log(`  - userId: ${userId}`);
        console.log(`  - clientId: ${clientId}`);

        // Generar numero de orden consecutivo automaticamente
        const orderNumber = await getNextOrderNumber("ptyss");
        console.log(`  - orderNumber generado: ${orderNumber}`);

        // Construir el objeto del registro
        const recordData: any = {
          excelId: validExcelId,
          module: "ptyss",
          type: "maritime",
          status: recordStatus,
          totalValue: totalValue || 0,
          data, // Datos originales completos
          sapCode: data.sapCode || null,
          orderNumber, // Numero de orden consecutivo (tipo PO)
          createdBy: userId
        };

        // Incluir containerConsecutive (que será order para registros locales o containerConsecutive para trasiego)
        if (containerConsecutive) {
          recordData.containerConsecutive = containerConsecutive;
        }

        // Solo incluir clientId si tiene un valor
        if (clientId) {
          recordData.clientId = clientId;
        }

        const record = await records.create(recordData);

        console.log(`✅ Registro PTYSS ${i + 1} guardado exitosamente:`, record._id);
        createdRecords.push(record);
      } catch (dbError: any) {
        // Manejar error de duplicado de MongoDB (código 11000)
        if (dbError.code === 11000) {
          console.warn(`⚠️ Registro PTYSS ${i + 1} omitido - duplicado en DB:`, dbError.keyValue);
          // Agregar a la lista de duplicados para el reporte
          const dupKey = dbError.keyValue?.containerConsecutive;
          if (dupKey && !allDuplicates.includes(dupKey)) {
            allDuplicates.push(dupKey);
          }
          // Continuar con el siguiente registro
          continue;
        }

        console.error(`❌ Error guardando registro PTYSS ${i + 1}:`, dbError);
        console.error(`  - Error name:`, dbError.name);
        console.error(`  - Error message:`, dbError.message);
        if (dbError.errors) {
          console.error(`  - Validation errors:`, JSON.stringify(dbError.errors, null, 2));
        }
        // Continuar con el siguiente registro en lugar de fallar completamente
      }
    }
    
    console.log(`🎉 Proceso completado. Registros PTYSS creados: ${createdRecords.length}/${recordsToProcess.length}`);
    
    // Si no se creó ningún registro y había registros para procesar
    if (createdRecords.length === 0 && recordsToProcess.length > 0) {
      console.warn("⚠️ No se creó ningún registro PTYSS - todos fueron duplicados o fallaron.");

      // Si todos fueron duplicados detectados durante la inserción, reportar como éxito parcial
      if (allDuplicates.length > 0) {
        return response(res, 201, {
          records: [],
          count: 0,
          totalProcessed: recordsData.length,
          duplicates: {
            count: allDuplicates.length,
            containerConsecutives: Array.from(new Set(allDuplicates))
          },
          message: `Todos los ${recordsToProcess.length} registros ya existían en la base de datos. 0 registros nuevos fueron creados.`
        });
      }

      // Si realmente hubo un error (no duplicados)
      console.error("❌ No se pudo crear ningún registro PTYSS. Posibles causas: errores de validación del schema o permisos insuficientes.");
      return response(res, 500, {
        error: "No se pudo crear ningún registro. Verifica los datos y permisos.",
        message: "Error al guardar los registros en la base de datos. Verifica que todos los campos requeridos sean válidos.",
        totalProcessed: recordsData.length,
        recordsProcessed: recordsToProcess.length
      });
    }
    
    // Convertir ObjectIds a strings para la serialización JSON
    const serializedRecords = createdRecords.map(record => {
      const recordObj = record.toObject();
      return {
        ...recordObj,
        _id: recordObj._id.toString(),
        excelId: recordObj.excelId.toString(),
        createdBy: recordObj.createdBy.toString()
      };
    });
    
    const responseData: any = { 
      message: "Registros de PTYSS creados exitosamente",
      records: serializedRecords || [], 
      count: serializedRecords ? serializedRecords.length : 0,
      totalProcessed: recordsData.length
    };
    
    // Agregar información sobre duplicados si los hubo
    if (allDuplicates.length > 0) {
      responseData.duplicates = {
        count: allDuplicates.length,
        containerConsecutives: Array.from(new Set(allDuplicates))
      };
      responseData.message = `${serializedRecords.length} registros nuevos creados, ${allDuplicates.length} duplicados omitidos.`;
    }

    if (softDeletedRecoverableList.length > 0) {
      responseData.softDeletedRecoverableList = softDeletedRecoverableList;
      const extra =
        ` ${softDeletedRecoverableList.length} fila(s) no se importaron: la orden/clave coincide con un registro eliminado (desde "Registro local individual" puede recuperarlo).`;
      responseData.message = (responseData.message || '') + extra;
    }
    
    console.log("📤 Enviando respuesta al frontend:", responseData);
    console.log("📤 Registros en la respuesta:", responseData.records.length);
    if (responseData.records.length > 0) {
      console.log("📤 Primer registro de ejemplo:", JSON.stringify(responseData.records[0], null, 2));
    }
    
    return response(res, 201, responseData);
  } catch (error) {
    console.error("Error creating PTYSS records:", error);
    return response(res, 500, { 
      error: "Error al crear registros de PTYSS",
      details: error.message 
    });
  }
}; 