import { records, uploadJobs } from "../../database";
import { response } from "../../utils";
import mongoose from "mongoose";

/**
 * Crea un job de procesamiento para ShipChandler y responde inmediatamente.
 * El procesamiento real ocurre en background.
 */
export default async (req, res) => {
  try {
    console.log("=== CREATE SHIPCHANDLER RECORDS ASYNC ===");

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
      module: 'shipchandler',
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

    console.log(`📋 Job creado: ${job._id} para ${recordsData.length} registros ShipChandler`);

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
    console.error("❌ Error creando job ShipChandler:", error);
    return response(res, 500, {
      error: "Error interno al crear el trabajo de procesamiento",
      details: error.message
    });
  }
};

/**
 * Procesa los registros de ShipChandler en background y actualiza el job
 */
async function processRecordsInBackground(
  jobId: mongoose.Types.ObjectId,
  excelId: mongoose.Types.ObjectId,
  recordsData: any[],
  userId: mongoose.Types.ObjectId
) {
  console.log(`🔄 Iniciando procesamiento background ShipChandler para job ${jobId}`);

  try {
    // Marcar como procesando
    await uploadJobs.updateOne(
      { _id: jobId },
      {
        status: 'processing',
        startedAt: new Date()
      }
    );

    // Normalizar invoiceNos para verificar duplicados
    const containerConsecutives = recordsData
      .map(record => {
        const invoiceNo = record.data?.invoiceNo;
        return invoiceNo ? String(invoiceNo).trim() : null;
      })
      .filter(Boolean);

    // Verificar duplicados en la BD
    const existingRecords = await records.find({
      module: 'shipchandler',
      containerConsecutive: { $in: containerConsecutives }
    });

    const existingContainerConsecutives = existingRecords
      .map(r => r.containerConsecutive ? String(r.containerConsecutive).trim() : null)
      .filter(Boolean);

    const duplicateContainerConsecutives = containerConsecutives.filter(cc =>
      existingContainerConsecutives.includes(cc)
    );

    // Actualizar job con info de duplicados
    await uploadJobs.updateOne(
      { _id: jobId },
      {
        duplicateRecords: duplicateContainerConsecutives.length,
        duplicates: duplicateContainerConsecutives.slice(0, 100)
      }
    );

    // Filtrar registros duplicados
    const recordsToProcess = recordsData.filter(record => {
      const invoiceNo = record.data?.invoiceNo ? String(record.data.invoiceNo).trim() : null;
      return invoiceNo && !duplicateContainerConsecutives.includes(invoiceNo);
    });

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
        const recordsToInsert = batch.map((recordData) => {
          const data = recordData.data || {};
          const invoiceNo = data.invoiceNo ? String(data.invoiceNo).trim() : null;

          return {
            excelId: excelId,
            module: 'shipchandler',
            type: 'supply-order',
            status: 'completado',
            totalValue: recordData.totalValue || data.total || 0,
            data,
            clientId: data.clientId ? new mongoose.Types.ObjectId(data.clientId) : undefined,
            containerConsecutive: invoiceNo,
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
        uploadErrors: uploadErrors.slice(0, 50),
        result: {
          success: createdIds.length > 0,
          message: `Creados ${createdIds.length} registros, ${duplicateContainerConsecutives.length} duplicados, ${uploadErrors.length} errores`,
          recordIds: createdIds.slice(0, 100)
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
