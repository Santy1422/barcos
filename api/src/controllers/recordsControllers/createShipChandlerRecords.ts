import { records } from "../../database";
import { response } from "../../utils";
import mongoose from "mongoose";

interface ShipChandlerRecordData {
  customerName: string;
  invoiceNo: string;
  invoiceType: string;
  vessel: string;
  date: string;
  referenceNo: string;
  deliveryAddress: string;
  discount: number;
  deliveryExpenses: number;
  portEntryFee: number;
  customsFee: number;
  authorities: number;
  otherExpenses: number;
  overTime: number;
  total: number;
  clientId?: string;
}

export default async (req, res) => {
  try {
    console.log("=== CREATE SHIPCHANDLER RECORDS ===");
    console.log("Body recibido:", req.body);
    console.log("Usuario autenticado:", req.user);
    console.log("Headers:", req.headers);
    
    const { excelId, recordsData } = req.body;
    const userId = req.user?._id;
    
    console.log("excelId:", excelId);
    console.log("recordsData length:", recordsData?.length);
    console.log("userId:", userId);
    console.log("recordsData sample (first 2):", JSON.stringify(recordsData?.slice(0, 2), null, 2));
    
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
    
    // Verificar duplicados por containerConsecutive (que será invoiceNo para ShipChandler)
    // Normalizar invoiceNos (trim y convertir a string) para usarlos como containerConsecutive
    const containerConsecutives = recordsData
      .map(record => {
        const invoiceNo = record.data?.invoiceNo;
        return invoiceNo ? String(invoiceNo).trim() : null;
      })
      .filter(Boolean);
    
    console.log("🔍 Verificando duplicados por containerConsecutive (invoiceNo)...");
    console.log("ContainerConsecutives (invoiceNos) a verificar:", containerConsecutives);
    console.log("Total containerConsecutives únicos:", new Set(containerConsecutives).size);
    
    // Buscar registros existentes con los mismos containerConsecutive en el módulo shipchandler
    const existingRecords = await records.find({
      module: 'shipchandler',
      containerConsecutive: { $in: containerConsecutives }
    });
    
    const existingContainerConsecutives = existingRecords
      .map(r => r.containerConsecutive ? String(r.containerConsecutive).trim() : null)
      .filter(Boolean);
    
    console.log("ContainerConsecutives existentes en BD:", existingContainerConsecutives);
    
    const duplicateContainerConsecutives = containerConsecutives.filter(cc => 
      existingContainerConsecutives.includes(cc)
    );
    
    console.log("📊 Resultado de verificación de duplicados:");
    console.log("  - Registros existentes encontrados:", existingRecords.length);
    console.log("  - ContainerConsecutives duplicados:", duplicateContainerConsecutives);
    
    // Filtrar registros duplicados (normalizando invoiceNo para comparación)
    const recordsToProcess = recordsData.filter(record => {
      const invoiceNo = record.data?.invoiceNo ? String(record.data.invoiceNo).trim() : null;
      return invoiceNo && !duplicateContainerConsecutives.includes(invoiceNo);
    });
    
    console.log("📝 Registros a procesar después de filtrar duplicados:");
    console.log("  - Total original:", recordsData.length);
    console.log("  - Duplicados encontrados:", duplicateContainerConsecutives.length);
    console.log("  - Registros válidos para procesar:", recordsToProcess.length);
    
    // Si no hay registros válidos para procesar, retornar respuesta con 0 creados
    if (recordsToProcess.length === 0) {
      console.log('createShipChandlerRecords - No hay registros válidos para procesar');
      const responseData: any = { 
        records: [], 
        count: 0,
        totalProcessed: recordsData.length
      };
      
      if (duplicateContainerConsecutives.length > 0) {
        responseData.duplicates = {
          count: duplicateContainerConsecutives.length,
          invoiceNos: duplicateContainerConsecutives
        };
      }
      
      return response(res, 200, responseData);
    }
    
    const createdRecords = [];
    
    for (let i = 0; i < recordsToProcess.length; i++) {
      const recordData = recordsToProcess[i];
      console.log(`\n📦 Procesando registro ${i + 1}/${recordsToProcess.length}`);
      console.log(`  - recordData:`, JSON.stringify(recordData, null, 2));
      
      const data = recordData.data || {};
      const totalValue = recordData.totalValue || data.total || 0;
      
      console.log(`  - data extraído:`, JSON.stringify(data, null, 2));
      console.log(`  - totalValue:`, totalValue);
      
      // Normalizar invoiceNo
      const invoiceNo = data.invoiceNo ? String(data.invoiceNo).trim() : null;
      
      if (!data || !invoiceNo) {
        console.warn(`⚠️ Registro ${i + 1} sin invoiceNo válido, saltando...`);
        console.warn(`  - data:`, data);
        console.warn(`  - invoiceNo original:`, data?.invoiceNo);
        continue;
      }
      
      // Actualizar data con invoiceNo normalizado
      data.invoiceNo = invoiceNo;
      
      try {
        console.log(`💾 Guardando registro ShipChandler ${i + 1} en MongoDB...`);
        console.log(`  - invoiceNo:`, invoiceNo);
        console.log(`  - clientId:`, data.clientId);
        console.log(`  - excelId:`, validExcelId);
        console.log(`  - userId:`, userId);
        
        // Extraer clientId de los datos si existe
        const clientId = data.clientId || null;
        
        // Usar invoiceNo como containerConsecutive para evitar problemas con el índice único
        // Esto es necesario porque el índice único { module: 1, containerConsecutive: 1 } requiere valores únicos
        const containerConsecutive = invoiceNo;
        
        console.log(`  - containerConsecutive (invoiceNo):`, containerConsecutive);
        
        const recordPayload = {
          excelId: validExcelId,
          module: "shipchandler",
          type: "supply-order",
          status: "completado", // ShipChandler registros se consideran completados
          totalValue: totalValue || 0,
          data, // Datos originales completos
          clientId, // Campo específico para referencias del cliente
          containerConsecutive, // Usar invoiceNo como containerConsecutive para el índice único
          createdBy: userId
        };
        
        console.log(`  - Payload a guardar:`, JSON.stringify(recordPayload, null, 2));
        
        const record = await records.create(recordPayload);
        
        console.log(`✅ Registro ShipChandler ${i + 1} guardado exitosamente:`, record._id);
        createdRecords.push(record);
      } catch (dbError: any) {
        console.error(`❌ Error guardando registro ShipChandler ${i + 1}:`, dbError);
        console.error(`  - Error name:`, dbError.name);
        console.error(`  - Error message:`, dbError.message);
        console.error(`  - Error stack:`, dbError.stack);
        if (dbError.errors) {
          console.error(`  - Error details:`, JSON.stringify(dbError.errors, null, 2));
        }
        // Continuar con el siguiente registro en lugar de fallar completamente
      }
    }
    
    console.log(`🎉 Proceso completado. Registros creados: ${createdRecords.length}/${recordsToProcess.length}`);
    
    // Convertir ObjectIds a strings para la serialización JSON
    const recordsResponse = createdRecords.map(record => ({
      _id: record._id.toString(),
      excelId: record.excelId.toString(),
      module: record.module,
      type: record.type,
      status: record.status,
      totalValue: record.totalValue,
      data: record.data,
      clientId: record.clientId?.toString(),
      containerConsecutive: record.containerConsecutive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }));
    
    const responseData: any = {
      records: recordsResponse,
      count: createdRecords.length,
      totalProcessed: recordsData.length
    };
    
    if (duplicateContainerConsecutives.length > 0) {
      responseData.duplicates = {
        count: duplicateContainerConsecutives.length,
        invoiceNos: duplicateContainerConsecutives
      };
    }
    
    return response(res, 201, responseData);
    
  } catch (error) {
    console.error("❌ Error en createShipChandlerRecords:", error);
    return response(res, 500, { 
      error: "Error interno del servidor al crear registros de ShipChandler" 
    });
  }
};

