import { records, uploadJobs, getNextOrderNumber } from "../../database";
import { response } from "../../utils";
import mongoose from "mongoose";

/**
 * Crea un job de procesamiento y responde inmediatamente.
 * El procesamiento real ocurre en background.
 */
export default async (req, res) => {
  try {
    console.log("=== CREATE TRUCKING RECORDS ASYNC ===");

    const { excelId, recordsData } = req.body;
    const userId = req.user?._id;
    const userEmail = req.user?.email;

    // Validar excelId
    let validExcelId;
    try {
      validExcelId = new mongoose.Types.ObjectId(excelId);
    } catch (error) {
      return response(res, 400, {
        error: "excelId inválido - debe ser un ObjectId válido"
      });
    }

    // Validar datos requeridos
    if (!validExcelId || !recordsData || !Array.isArray(recordsData) || !userId) {
      return response(res, 400, {
        error: "Faltan datos requeridos: excelId, recordsData (array), usuario autenticado"
      });
    }

    // Crear el job
    const job = await uploadJobs.create({
      module: 'trucking',
      status: 'pending',
      userId,
      userEmail: userEmail || 'unknown',
      excelId: validExcelId,
      totalRecords: recordsData.length,
      processedRecords: 0,
      createdRecords: 0,
      duplicateRecords: 0,
      errorRecords: 0,
      uploadErrors: [],
      duplicates: []
    });

    console.log(`📋 Job creado: ${job._id} para ${recordsData.length} registros`);

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
    console.error("❌ Error creando job:", error);
    return response(res, 500, {
      error: "Error interno al crear el trabajo de procesamiento",
      details: error.message
    });
  }
};

/**
 * Procesa los registros en background y actualiza el job
 */
async function processRecordsInBackground(
  jobId: mongoose.Types.ObjectId,
  excelId: mongoose.Types.ObjectId,
  recordsData: any[],
  userId: mongoose.Types.ObjectId
) {
  console.log(`🔄 Iniciando procesamiento background para job ${jobId}`);

  try {
    // Marcar como procesando
    await uploadJobs.updateOne(
      { _id: jobId },
      {
        status: 'processing',
        startedAt: new Date()
      }
    );

    // Verificar duplicados por containerConsecutive
    const containerConsecutives = recordsData
      .map(record => record.data?.containerConsecutive)
      .filter(Boolean);

    const existingRecords = await records.find({
      module: 'trucking',
      containerConsecutive: { $in: containerConsecutives }
    });

    const existingContainerConsecutives = existingRecords.map(r => r.containerConsecutive);
    const duplicateContainerConsecutives = containerConsecutives.filter(cc =>
      existingContainerConsecutives.includes(cc)
    );

    // Filtrar registros duplicados
    const recordsToProcess = recordsData.filter(record =>
      !duplicateContainerConsecutives.includes(record.data?.containerConsecutive)
    );

    // Actualizar job con info de duplicados
    await uploadJobs.updateOne(
      { _id: jobId },
      {
        duplicateRecords: duplicateContainerConsecutives.length,
        duplicates: duplicateContainerConsecutives.slice(0, 100) // Limitar a 100 para no llenar la DB
      }
    );

    if (recordsToProcess.length === 0) {
      // No hay registros válidos
      await uploadJobs.updateOne(
        { _id: jobId },
        {
          status: 'completed',
          completedAt: new Date(),
          processedRecords: recordsData.length,
          createdRecords: 0,
          result: {
            success: true,
            message: `Todos los ${duplicateContainerConsecutives.length} registros ya existen`,
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
        // Preparar documentos para insercion (debe coincidir con recordsSchema)
        // Generar orderNumbers secuencialmente para mantener orden
        const recordsToInsert = [];
        for (const record of batch) {
          const data = record.data || {};
          const sapCode = data.sapCode || null;
          const containerConsecutive = data.containerConsecutive || null;
          const clientId = data.clientId || null;
          const module = data.sapCode === 'PTYSS001' ? 'ptyss' : 'trucking';
          const type = module === 'ptyss' ? 'maritime' : 'transport';

          // Generar numero de orden consecutivo automaticamente
          const orderNumber = await getNextOrderNumber(module);

          recordsToInsert.push({
            excelId: excelId,
            module,
            type,
            status: 'pendiente',
            totalValue: record.totalValue || 0,
            data,
            sapCode,
            containerConsecutive,
            orderNumber, // Numero de orden consecutivo (tipo PO)
            clientId: clientId ? new mongoose.Types.ObjectId(clientId) : undefined,
            createdBy: userId
          });
        }

        // Insertar lote
        const insertedRecords = await records.insertMany(recordsToInsert, { ordered: false })
          .catch(async (err) => {
            console.error(`❌ insertMany error:`, err.message);
            // Manejar errores de duplicados parciales
            if (err.writeErrors) {
              err.writeErrors.forEach((writeErr: any) => {
                uploadErrors.push({
                  row: i + writeErr.index,
                  message: writeErr.errmsg || 'Error de inserción'
                });
              });
            }
            if (err.errors) {
              Object.values(err.errors).forEach((valErr: any) => {
                console.error(`  Validation error: ${valErr.message}`);
              });
            }
            // Retornar los que sí se insertaron
            return err.insertedDocs || [];
          });

        if (insertedRecords && insertedRecords.length > 0) {
          createdIds.push(...insertedRecords.map((r: any) => r._id.toString()));
        }

        processedCount += batch.length;

        // Actualizar progreso cada lote
        await uploadJobs.updateOne(
          { _id: jobId },
          {
            processedRecords: processedCount + duplicateContainerConsecutives.length,
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
        uploadErrors: uploadErrors.slice(0, 50), // Limitar errores guardados
        result: {
          success: createdIds.length > 0,
          message: `Creados ${createdIds.length} registros, ${duplicateContainerConsecutives.length} duplicados, ${uploadErrors.length} errores`,
          recordIds: createdIds.slice(0, 100) // Limitar IDs guardados
        }
      }
    );

    console.log(`✅ Job ${jobId} completado: ${createdIds.length} creados, ${duplicateContainerConsecutives.length} duplicados, ${uploadErrors.length} errores`);

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
