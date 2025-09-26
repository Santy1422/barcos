import { records } from "../../database";
import { response } from "../../utils";
import mongoose from "mongoose";

interface AgencyRecordData {
  serviceId?: string;
  serviceDate: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  vessel: string;
  voyage?: string;
  crewName: string;
  crewRank?: string;
  nationality?: string;
  transportCompany?: string;
  driverName?: string;
  flightInfo?: string;
  waitingTime?: number;
  passengerCount?: number;
  price: number;
  currency: string;
  serviceCode?: string;
  clientName: string;
  clientId?: string;
  comments?: string;
  sapCode?: string;
  invoiceReference?: string;
}

export default async (req, res) => {
  try {
    console.log("=== CREATE AGENCY RECORDS ===");
    console.log("Body recibido:", req.body);
    console.log("Usuario autenticado:", req.user);
    
    const { excelId, recordsData, isManualEntry = false } = req.body;
    const userId = req.user?._id;
    
    console.log("excelId:", excelId);
    console.log("recordsData length:", recordsData?.length);
    console.log("userId:", userId);
    console.log("isManualEntry:", isManualEntry);
    
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
        console.log("excelId convertido a ObjectId:", validExcelId);
      } catch (error) {
        console.error("❌ Error convirtiendo excelId a ObjectId:", error);
        return response(res, 400, { 
          error: "excelId inválido - debe ser un ObjectId válido" 
        });
      }
    }
    
    // Validar que los datos requeridos estén presentes
    if (!recordsData || !Array.isArray(recordsData) || !userId) {
      console.log("❌ Validación fallida:");
      console.log("  - recordsData:", !!recordsData);
      console.log("  - Array.isArray(recordsData):", Array.isArray(recordsData));
      console.log("  - userId:", !!userId);
      
      return response(res, 400, { 
        error: "Faltan datos requeridos: recordsData (array), usuario autenticado" 
      });
    }
    
    // Para agency, verificamos duplicados por una combinación única
    // Usamos: vessel + voyage + crewName + serviceDate como identificador único
    const uniqueIdentifiers = recordsData.map(record => {
      const data = record.data || record;
      return {
        vessel: data.vessel,
        voyage: data.voyage || '',
        crewName: data.crewName,
        serviceDate: data.serviceDate,
        identifier: `${data.vessel}-${data.voyage || ''}-${data.crewName}-${data.serviceDate}`
      };
    });
    
    console.log("🔍 Verificando duplicados para agency...");
    console.log("Identificadores únicos:", uniqueIdentifiers.map(u => u.identifier));
    
    // Buscar registros existentes con los mismos identificadores en el módulo agency
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
    
    console.log("📊 Resultado de verificación de duplicados:");
    console.log("  - Registros existentes encontrados:", existingRecords.length);
    console.log("  - Identificadores duplicados:", duplicateIdentifiers);
    
    // Filtrar registros duplicados
    const recordsToProcess = recordsData.filter((record, index) => 
      !duplicateIdentifiers.includes(uniqueIdentifiers[index].identifier)
    );
    
    console.log("📝 Registros a procesar después de filtrar duplicados:");
    console.log("  - Total original:", recordsData.length);
    console.log("  - Duplicados encontrados:", duplicateIdentifiers.length);
    console.log("  - Registros válidos para procesar:", recordsToProcess.length);
    
    // Si no hay registros válidos para procesar, retornar respuesta con 0 creados
    if (recordsToProcess.length === 0) {
      console.log('createAgencyRecords - No hay registros válidos para procesar');
      const responseData: any = { 
        records: [], 
        count: 0,
        totalProcessed: recordsData.length
      };
      
      if (duplicateIdentifiers.length > 0) {
        responseData.duplicates = {
          count: duplicateIdentifiers.length,
          identifiers: duplicateIdentifiers
        };
        responseData.message = `No se crearon registros. Se encontraron ${duplicateIdentifiers.length} registros duplicados.`;
      }
      
      return response(res, 200, responseData);
    }
    
    // Mapear los datos para crear los registros
    const recordsToCreate = recordsToProcess.map(record => {
      const data = record.data || record;
      
      // Extraer el sapCode si existe
      const sapCode = data.sapCode || data.serviceCode || null;
      
      // Para agency, usamos el serviceId como identificador único si existe
      const serviceReference = data.serviceId || 
        `${data.vessel}-${data.crewName}-${new Date(data.serviceDate).getTime()}`;
      
      return {
        excelId: validExcelId,
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
        containerConsecutive: null, // Agency no usa container consecutive
        clientId: data.clientId ? new mongoose.Types.ObjectId(data.clientId) : null,
        invoiceId: null,
        createdBy: new mongoose.Types.ObjectId(userId)
      };
    });
    
    console.log("📝 Estructura de registros a crear:");
    console.log(JSON.stringify(recordsToCreate[0], null, 2));
    
    // Crear los registros en la base de datos
    const createdRecords = await records.insertMany(recordsToCreate, { ordered: false });
    
    console.log(`✅ ${createdRecords.length} registros de agency creados exitosamente`);
    
    // Construir respuesta detallada
    const responseData: any = {
      records: createdRecords,
      count: createdRecords.length,
      totalProcessed: recordsData.length
    };
    
    if (duplicateIdentifiers.length > 0) {
      responseData.duplicates = {
        count: duplicateIdentifiers.length,
        identifiers: duplicateIdentifiers
      };
      responseData.message = `Se crearon ${createdRecords.length} registros. Se omitieron ${duplicateIdentifiers.length} duplicados.`;
    } else {
      responseData.message = `Se crearon ${createdRecords.length} registros exitosamente.`;
    }
    
    // Populate de información adicional si es necesario
    const populatedRecords = await records.find({ 
      _id: { $in: createdRecords.map(r => r._id) } 
    })
    .populate('clientId', 'comercialName sapCode')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
    
    responseData.records = populatedRecords;
    
    return response(res, 201, responseData);
    
  } catch (error) {
    console.error("❌ Error en createAgencyRecords:", error);
    
    // Manejo específico de errores de duplicados
    if (error.code === 11000) {
      return response(res, 400, {
        error: "Error de duplicado: Ya existe un registro con estos datos.",
        details: error.keyPattern
      });
    }
    
    return response(res, 500, {
      error: "Error al crear registros de agency",
      details: error.message
    });
  }
};