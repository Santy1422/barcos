import { records } from "../../database";
import { response } from "../../utils";
import mongoose from "mongoose";

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
    
    // Verificar duplicados por containerConsecutive en el módulo ptyss
    const containerConsecutives = recordsData
      .map(record => record.data?.containerConsecutive)
      .filter(Boolean);
    
    console.log("🔍 Verificando duplicados por containerConsecutive...");
    console.log("ContainerConsecutives a verificar:", containerConsecutives);
    
    // Buscar registros existentes con los mismos containerConsecutive en el módulo ptyss
    const existingRecords = await records.find({
      module: 'ptyss',
      containerConsecutive: { $in: containerConsecutives }
    });
    
    const existingContainerConsecutives = existingRecords.map(r => r.containerConsecutive);
    const duplicateContainerConsecutives = containerConsecutives.filter(cc => 
      existingContainerConsecutives.includes(cc)
    );
    
    console.log("📊 Resultado de verificación de duplicados:");
    console.log("  - Registros existentes encontrados:", existingRecords.length);
    console.log("  - ContainerConsecutives duplicados:", duplicateContainerConsecutives);
    
    // Filtrar registros duplicados
    const recordsToProcess = recordsData.filter(record => 
      !duplicateContainerConsecutives.includes(record.data?.containerConsecutive)
    );
    
    console.log("📝 Registros a procesar después de filtrar duplicados:");
    console.log("  - Total original:", recordsData.length);
    console.log("  - Duplicados encontrados:", duplicateContainerConsecutives.length);
    console.log("  - Registros válidos para procesar:", recordsToProcess.length);
    
    // Si no hay registros válidos para procesar, retornar respuesta con 0 creados
    if (recordsToProcess.length === 0) {
      console.log('createPTYSSRecords - No hay registros válidos para procesar');
      const responseData: any = { 
        records: [], 
        count: 0,
        totalProcessed: recordsData.length
      };
      
      if (duplicateContainerConsecutives.length > 0) {
        responseData.duplicates = {
          count: duplicateContainerConsecutives.length,
          containerConsecutives: duplicateContainerConsecutives.filter((cc, index) => duplicateContainerConsecutives.indexOf(cc) === index)
        };
        responseData.message = `Todos los registros eran duplicados. 0 registros nuevos fueron creados.`;
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
        
        // Extraer containerConsecutive para el campo de nivel superior
        const containerConsecutive = data.containerConsecutive || null;
        const clientId = data.clientId || null;
        
        console.log(`  - containerConsecutive: ${containerConsecutive}`);
        console.log(`  - Es trasiego: ${isTrasiego ? 'SÍ' : 'NO'}`);
        console.log(`  - Estado asignado: ${recordStatus}`);
        
        const record = await records.create({
          excelId: validExcelId,
          module: "ptyss",
          type: "maritime",
          status: recordStatus,
          totalValue: totalValue || 0,
          data, // Datos originales completos
          sapCode: data.sapCode || null,
          containerConsecutive, // Campo específico para consultas y validación de duplicados
          clientId, // Campo específico para referencias del cliente
          createdBy: userId
        });
        
        console.log(`✅ Registro PTYSS ${i + 1} guardado exitosamente:`, record._id);
        createdRecords.push(record);
      } catch (dbError) {
        console.error(`❌ Error guardando registro PTYSS ${i + 1}:`, dbError);
        console.error(`  - Error details:`, dbError.message);
        // Continuar con el siguiente registro en lugar de fallar completamente
      }
    }
    
    console.log(`🎉 Proceso completado. Registros PTYSS creados: ${createdRecords.length}/${recordsToProcess.length}`);
    
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
    if (duplicateContainerConsecutives.length > 0) {
      responseData.duplicates = {
        count: duplicateContainerConsecutives.length,
        containerConsecutives: duplicateContainerConsecutives.filter((cc, index) => duplicateContainerConsecutives.indexOf(cc) === index)
      };
      responseData.message = `${serializedRecords.length} registros nuevos creados, ${duplicateContainerConsecutives.length} duplicados omitidos.`;
    }
    
    console.log("📤 Enviando respuesta al frontend:", responseData);
    console.log("📤 Registros en la respuesta:", responseData.records.length);
    console.log("📤 Primer registro de ejemplo:", JSON.stringify(responseData.records[0], null, 2));
    
    return response(res, 201, responseData);
  } catch (error) {
    console.error("Error creating PTYSS records:", error);
    return response(res, 500, { 
      error: "Error al crear registros de PTYSS",
      details: error.message 
    });
  }
}; 