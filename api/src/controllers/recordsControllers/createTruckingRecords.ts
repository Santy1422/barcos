import { records } from "../../database";
import { response } from "../../utils";
import mongoose from "mongoose";

interface TruckingExcelData {
  bl: string;
  container: string;
  containerConsecutive: string;
  size: string;
  type: string;
  driverName: string;
  plate: string;
  moveDate: string;
  associate: string;
  sapCode?: string;
}

export default async (req, res) => {
  try {
    console.log("=== CREATE TRUCKING RECORDS ===");
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
    
    const createdRecords = [];
    
    console.log("🔄 Iniciando creación de registros...");
    
    for (let i = 0; i < recordsData.length; i++) {
      const recordData = recordsData[i];
      const { data, totalValue } = recordData;
      
      console.log(`📝 Procesando registro ${i + 1}/${recordsData.length}:`);
      console.log(`  - totalValue: ${totalValue}`);
      console.log(`  - data keys: ${Object.keys(data).join(', ')}`);
      console.log(`  - sapCode: ${data.sapCode || 'no encontrado'}`);
      
      // Validar que cada registro tenga los datos necesarios
      if (!data || totalValue === undefined) {
        console.warn(`⚠️ Registro ${i + 1} inválido saltado:`, recordData);
        continue;
      }
      
      try {
        console.log(`💾 Guardando registro ${i + 1} en MongoDB...`);
        
        // Extraer sapCode y containerConsecutive de los datos si existen
        const sapCode = data.sapCode || null;
        const containerConsecutive = data.containerConsecutive || null;
        
        // Determinar el módulo basado en el sapCode o en los datos
        const module = data.sapCode === 'PTYSS001' ? 'ptyss' : 'trucking';
        const type = module === 'ptyss' ? 'maritime' : 'transport';
        
        // Determinar el estado para trucking: si hizo match, marcar como completado
        const isMatched = Boolean((data && (data.isMatched === true)) || (data && Number(data.matchedPrice) > 0) || Number(totalValue) > 0)
        const computedStatus = module === 'trucking' && isMatched ? 'completado' : 'pendiente'

        const record = await records.create({
          excelId: validExcelId,
          module: module,
          type: type,
          status: computedStatus,
          totalValue: totalValue || 0,
          data, // Datos originales completos
          sapCode, // Campo específico para consultas
          containerConsecutive, // Campo específico para consultas
          createdBy: userId
        });
        
        console.log(`✅ Registro ${i + 1} guardado exitosamente:`, record._id);
        createdRecords.push(record);
      } catch (dbError) {
        console.error(`❌ Error guardando registro ${i + 1}:`, dbError);
        console.error(`  - Error details:`, dbError.message);
        // Continuar con el siguiente registro en lugar de fallar completamente
      }
    }
    
    console.log(`🎉 Proceso completado. Registros creados: ${createdRecords.length}/${recordsData.length}`);
    
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
    
    const responseData = {
      message: "Registros de trucking creados exitosamente",
      records: serializedRecords,
      count: serializedRecords.length
    };
    
    console.log("📤 Enviando respuesta al frontend:", responseData);
    console.log("📤 Registros en la respuesta:", responseData.records.length);
    console.log("📤 Primer registro de ejemplo:", JSON.stringify(responseData.records[0], null, 2));
    
    return response(res, 201, responseData);
  } catch (error) {
    console.error("Error creating trucking records:", error);
    return response(res, 500, { 
      error: "Error al crear registros de trucking",
      details: error.message 
    });
  }
};