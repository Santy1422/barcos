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
    
    const createdRecords = [];
    
    console.log("🔄 Iniciando creación de registros PTYSS...");
    
    for (let i = 0; i < recordsData.length; i++) {
      const recordData = recordsData[i];
      const { data, totalValue } = recordData;
      
      console.log(`📝 Procesando registro PTYSS ${i + 1}/${recordsData.length}:`);
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
        
        const record = await records.create({
          excelId: validExcelId,
          module: "ptyss",
          type: "maritime",
          status: "pendiente",
          totalValue: totalValue || 0,
          data, // Datos originales completos
          sapCode: data.clientId, // Usar clientId como sapCode para consultas
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
    
    console.log(`🎉 Proceso completado. Registros PTYSS creados: ${createdRecords.length}/${recordsData.length}`);
    
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
      message: "Registros de PTYSS creados exitosamente",
      records: serializedRecords,
      count: serializedRecords.length
    };
    
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