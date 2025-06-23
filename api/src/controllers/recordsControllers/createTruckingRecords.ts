import { records } from "../../database";
import { response } from "../../utils";

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
}

export default async (req, res) => {
  try {
    const { excelId, recordsData, createdBy } = req.body;
    
    // Validar que los datos requeridos estén presentes
    if (!excelId || !recordsData || !Array.isArray(recordsData) || !createdBy) {
      return response(res, 400, { 
        error: "Faltan datos requeridos: excelId, recordsData (array), createdBy" 
      });
    }
    
    const createdRecords = [];
    
    for (const recordData of recordsData) {
      const { data, totalValue } = recordData;
      
      // Validar que cada registro tenga los datos necesarios
      if (!data || totalValue === undefined) {
        console.warn("Registro inválido saltado:", recordData);
        continue;
      }
      
      const record = await records.create({
        excelId,
        module: "trucking",
        type: "transport",
        status: "pendiente",
        totalValue: totalValue || 0,
        data, // Datos originales completos
        createdBy
      });
      
      createdRecords.push(record);
    }
    
    return response(res, 201, {
      message: "Registros de trucking creados exitosamente",
      records: createdRecords,
      count: createdRecords.length
    });
  } catch (error) {
    console.error("Error creating trucking records:", error);
    return response(res, 500, { 
      error: "Error al crear registros de trucking",
      details: error.message 
    });
  }
};