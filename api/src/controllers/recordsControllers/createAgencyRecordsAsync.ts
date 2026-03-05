import { records, uploadJobs } from "../../database";
import { response } from "../../utils";
import mongoose from "mongoose";

/**
 * Crea un job de procesamiento para Agency y responde inmediatamente.
 * El procesamiento real ocurre en background.
 */
export default async (req, res) => {
  try {
    console.log("=== CREATE AGENCY RECORDS ASYNC ===");

    const { excelId, recordsData, isManualEntry = false } = req.body;
    const userId = req.user?._id;
    const userEmail = req.user?.email;

    // Para entradas manuales, no requerimos excelId
    let validExcelId = null;
    if (!isManualEntry) {
      if (!excelId) {
        return response(res, 400, {
          error: "excelId es requerido para carga desde Excel"
        });
      }

      try {
        validExcelId = new mongoose.Types.ObjectId(excelId);
      } catch (error) {
        return response(res, 400, {
          error: "excelId inválido - debe ser un ObjectId válido"
        });
      }
    }

    // Validar datos requeridos
    if (!recordsData || !Array.isArray(recordsData) || !userId) {
      return response(res, 400, {
        error: "Faltan datos requeridos: recordsData (array), usuario autenticado"
      });
    }

    // Crear el job
    const job = await uploadJobs.create({
      module: 'agency',
      status: 'pending',
      userId,
      userEmail: userEmail || 'unknown',
      excelId: validExcelId || new mongoose.Types.ObjectId(),
      totalRecords: recordsData.length,
      processedRecords: 0,
      createdRecords: 0,
      duplicateRecords: 0,
      errorRecords: 0,
      uploadErrors: [],
      duplicates: []
    });

    console.log(`📋 Job creado: ${job._id} para ${recordsData.length} registros Agency`);

    // Responder inmediatamente con el job ID
    response(res, 202, {
      success: true,
      message: "Procesamiento iniciado",
      jobId: job._id,
      totalRecords: recordsData.length
    });

    // Procesar en background (después de responder)
    setImmediate(async () => {
      await processRecordsInBackground(job._id, validExcelId, recordsData, userId);
    });

  } catch (error: any) {
    console.error("❌ Error creando job Agency:", error);
    return response(res, 500, {
      error: "Error interno al crear el trabajo de procesamiento",
      details: error.message
    });
  }
};

// Helper para crear identificador único de Agency
const getUniqueIdentifier = (data: any): string => {
  return `${data.vessel}-${data.voyage || ''}-${data.crewName}-${data.serviceDate}`;
};

/**
 * Procesa los registros de Agency en background y actualiza el job
 */
async function processRecordsInBackground(
  jobId: mongoose.Types.ObjectId,
  excelId: mongoose.Types.ObjectId | null,
  recordsData: any[],
  userId: mongoose.Types.ObjectId
) {
  console.log(`🔄 Iniciando procesamiento background Agency para job ${jobId}`);

  try {
    // Marcar como procesando
    await uploadJobs.updateOne(
      { _id: jobId },
      {
        status: 'processing',
        startedAt: new Date()
      }
    );

    // Crear identificadores únicos para verificar duplicados
    const uniqueIdentifiers = recordsData.map(record => {
      const data = record.data || record;
      return {
        vessel: data.vessel,
        voyage: data.voyage || '',
        crewName: data.crewName,
        serviceDate: data.serviceDate,
        identifier: getUniqueIdentifier(data)
      };
    });

    // Verificar duplicados contra la BD
    const existingRecords = await records.find({
      module: 'agency',
      $or: uniqueIdentifiers.map(uid => ({
        'data.vessel': uid.vessel,
        'data.voyage': uid.voyage,
        'data.crewName': uid.crewName,
        'data.serviceDate': uid.serviceDate
      }))
    });

    const existingIdentifiers = existingRecords.map(r =>
      `${r.data.vessel}-${r.data.voyage || ''}-${r.data.crewName}-${r.data.serviceDate}`
    );

    const duplicateIdentifiers = uniqueIdentifiers
      .map(u => u.identifier)
      .filter(id => existingIdentifiers.includes(id));

    // Actualizar job con info de duplicados
    await uploadJobs.updateOne(
      { _id: jobId },
      {
        duplicateRecords: duplicateIdentifiers.length,
        duplicates: duplicateIdentifiers.slice(0, 100)
      }
    );

    // Filtrar registros duplicados
    const recordsToProcess = recordsData.filter((record, index) =>
      !duplicateIdentifiers.includes(uniqueIdentifiers[index].identifier)
    );

    if (recordsToProcess.length === 0) {
      await uploadJobs.updateOne(
        { _id: jobId },
        {
          status: 'completed',
          completedAt: new Date(),
          processedRecords: recordsData.length,
          createdRecords: 0,
          result: {
            success: true,
            message: `Todos los ${duplicateIdentifiers.length} registros ya existen`,
            recordIds: []
          }
        }
      );
      console.log(`✅ Job ${jobId} completado - todos duplicados`);
      return;
    }

    // Procesar en lotes de 100
    const BATCH_SIZE = 100;
    const createdIds: string[] = [];
    const uploadErrors: Array<{ row: number; message: string }> = [];
    let processedCount = 0;

    for (let i = 0; i < recordsToProcess.length; i += BATCH_SIZE) {
      const batch = recordsToProcess.slice(i, i + BATCH_SIZE);

      try {
        const recordsToInsert = batch.map((record) => {
          const data = record.data || record;
          const sapCode = data.sapCode || data.serviceCode || null;
          const serviceReference = data.serviceId ||
            `${data.vessel}-${data.crewName}-${new Date(data.serviceDate).getTime()}`;

          return {
            excelId: excelId || new mongoose.Types.ObjectId(),
            module: 'agency',
            type: data.serviceCode || 'AGENCY_SERVICE',
            status: 'pendiente',
            totalValue: data.price || 0,
            data: {
              ...data,
              serviceReference,
              processedAt: new Date().toISOString()
            },
            sapCode: sapCode,
            containerConsecutive: null,
            clientId: data.clientId ? new mongoose.Types.ObjectId(data.clientId) : undefined,
            createdBy: userId
          };
        });

        const insertedRecords = await records.insertMany(recordsToInsert, { ordered: false })
          .catch(async (err) => {
            if (err.writeErrors) {
              err.writeErrors.forEach((writeErr: any) => {
                uploadErrors.push({
                  row: i + writeErr.index,
                  message: writeErr.errmsg || 'Error de inserción'
                });
              });
            }
            return err.insertedDocs || [];
          });

        if (insertedRecords && insertedRecords.length > 0) {
          createdIds.push(...insertedRecords.map((r: any) => r._id.toString()));
        }

        processedCount += batch.length;

        // Actualizar progreso
        await uploadJobs.updateOne(
          { _id: jobId },
          {
            processedRecords: processedCount + duplicateIdentifiers.length,
            createdRecords: createdIds.length,
            errorRecords: uploadErrors.length
          }
        );

        console.log(`📊 Job ${jobId}: Procesados ${processedCount}/${recordsToProcess.length}`);

      } catch (batchError: any) {
        console.error(`❌ Error en lote ${i}-${i + BATCH_SIZE}:`, batchError.message);
        uploadErrors.push({
          row: i,
          message: `Error en lote: ${batchError.message}`
        });
      }
    }

    // Marcar como completado
    await uploadJobs.updateOne(
      { _id: jobId },
      {
        status: uploadErrors.length > 0 && createdIds.length === 0 ? 'failed' : 'completed',
        completedAt: new Date(),
        processedRecords: recordsData.length,
        createdRecords: createdIds.length,
        errorRecords: uploadErrors.length,
        uploadErrors: uploadErrors.slice(0, 50),
        result: {
          success: createdIds.length > 0,
          message: `Creados ${createdIds.length} registros, ${duplicateIdentifiers.length} duplicados, ${uploadErrors.length} errores`,
          recordIds: createdIds.slice(0, 100)
        }
      }
    );

    console.log(`✅ Job ${jobId} completado: ${createdIds.length} creados, ${duplicateIdentifiers.length} duplicados, ${uploadErrors.length} errores`);

  } catch (error: any) {
    console.error(`❌ Error procesando job ${jobId}:`, error);

    await uploadJobs.updateOne(
      { _id: jobId },
      {
        status: 'failed',
        completedAt: new Date(),
        result: {
          success: false,
          message: `Error: ${error.message}`
        }
      }
    );
  }
}
