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
    
    // Verificar duplicados por invoiceNo en el módulo shipchandler
    const invoiceNos = recordsData
      .map(record => record.data?.invoiceNo)
      .filter(Boolean);
    
    console.log("🔍 Verificando duplicados por invoiceNo...");
    console.log("InvoiceNos a verificar:", invoiceNos);
    
    // Buscar registros existentes con los mismos invoiceNo en el módulo shipchandler
    const existingRecords = await records.find({
      module: 'shipchandler',
      'data.invoiceNo': { $in: invoiceNos }
    });
    
    const existingInvoiceNos = existingRecords.map(r => r.data?.invoiceNo).filter(Boolean);
    const duplicateInvoiceNos = invoiceNos.filter(invoiceNo => 
      existingInvoiceNos.includes(invoiceNo)
    );
    
    console.log("📊 Resultado de verificación de duplicados:");
    console.log("  - Registros existentes encontrados:", existingRecords.length);
    console.log("  - InvoiceNos duplicados:", duplicateInvoiceNos);
    
    // Filtrar registros duplicados
    const recordsToProcess = recordsData.filter(record => 
      !duplicateInvoiceNos.includes(record.data?.invoiceNo)
    );
    
    console.log("📝 Registros a procesar después de filtrar duplicados:");
    console.log("  - Total original:", recordsData.length);
    console.log("  - Duplicados encontrados:", duplicateInvoiceNos.length);
    console.log("  - Registros válidos para procesar:", recordsToProcess.length);
    
    // Si no hay registros válidos para procesar, retornar respuesta con 0 creados
    if (recordsToProcess.length === 0) {
      console.log('createShipChandlerRecords - No hay registros válidos para procesar');
      const responseData: any = { 
        records: [], 
        count: 0,
        totalProcessed: recordsData.length
      };
      
      if (duplicateInvoiceNos.length > 0) {
        responseData.duplicates = {
          count: duplicateInvoiceNos.length,
          invoiceNos: duplicateInvoiceNos
        };
      }
      
      return response(res, 200, responseData);
    }
    
    const createdRecords = [];
    
    for (let i = 0; i < recordsToProcess.length; i++) {
      const recordData = recordsToProcess[i];
      const data = recordData.data || {};
      const totalValue = recordData.totalValue || data.total || 0;
      
      if (!data || !data.invoiceNo) {
        console.warn(`⚠️ Registro ${i + 1} sin invoiceNo, saltando...`);
        continue;
      }
      
      try {
        console.log(`💾 Guardando registro ShipChandler ${i + 1} en MongoDB...`);
        
        // Extraer clientId de los datos si existe
        const clientId = data.clientId || null;
        
        const record = await records.create({
          excelId: validExcelId,
          module: "shipchandler",
          type: "supply-order",
          status: "completado", // ShipChandler registros se consideran completados
          totalValue: totalValue || 0,
          data, // Datos originales completos
          clientId, // Campo específico para referencias del cliente
          createdBy: userId
        });
        
        console.log(`✅ Registro ShipChandler ${i + 1} guardado exitosamente:`, record._id);
        createdRecords.push(record);
      } catch (dbError) {
        console.error(`❌ Error guardando registro ShipChandler ${i + 1}:`, dbError);
        console.error(`  - Error details:`, dbError.message);
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
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }));
    
    const responseData: any = {
      records: recordsResponse,
      count: createdRecords.length,
      totalProcessed: recordsData.length
    };
    
    if (duplicateInvoiceNos.length > 0) {
      responseData.duplicates = {
        count: duplicateInvoiceNos.length,
        invoiceNos: duplicateInvoiceNos
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

