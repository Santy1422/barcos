import { records } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    console.log("=== GET RECORDS BY SAP CODE ===");
    console.log("Query params:", req.query);
    
    const { sapCode, module = "trucking", page = 1, limit = 50 } = req.query;
    
    if (!sapCode) {
      return response(res, 400, { 
        error: "sapCode es requerido" 
      });
    }
    
    console.log("Buscando registros con sapCode:", sapCode);
    console.log("Módulo:", module);
    console.log("Página:", page);
    console.log("Límite:", limit);
    
    // Construir filtro
    const filter: any = {
      sapCode: sapCode,
      module: module
    };
    
    console.log("Filtro aplicado:", filter);
    
    // Calcular skip para paginación
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Ejecutar consulta con paginación
    const [recordsList, totalCount] = await Promise.all([
      records.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .populate('excelId', 'filename uploadDate')
        .populate('clientId', 'name email')
        .populate('invoiceId', 'invoiceNumber totalAmount')
        .lean(),
      records.countDocuments(filter)
    ]);
    
    console.log(`Encontrados ${recordsList.length} registros de ${totalCount} total`);
    
    // Calcular información de paginación
    const totalPages = Math.ceil(totalCount / parseInt(limit as string));
    const hasNextPage = parseInt(page as string) < totalPages;
    const hasPrevPage = parseInt(page as string) > 1;
    
    // Calcular total de valores
    const totalValue = recordsList.reduce((sum, record) => sum + (record.totalValue || 0), 0);
    
    const responseData = {
      message: `Registros encontrados para sapCode: ${sapCode}`,
      records: recordsList,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit as string)
      },
      summary: {
        totalValue,
        averageValue: recordsList.length > 0 ? totalValue / recordsList.length : 0
      }
    };
    
    console.log("📤 Enviando respuesta:", {
      recordsCount: responseData.records.length,
      totalValue: responseData.summary.totalValue,
      pagination: responseData.pagination
    });
    
    return response(res, 200, responseData);
    
  } catch (error) {
    console.error("Error getting records by sapCode:", error);
    return response(res, 500, { 
      error: "Error al obtener registros por sapCode",
      details: error.message 
    });
  }
}; 