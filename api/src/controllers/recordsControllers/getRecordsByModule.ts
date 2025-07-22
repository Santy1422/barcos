import { Request, Response } from "express";
import { records } from "../../database";

const getRecordsByModule = async (req: Request, res: Response) => {
  try {
    console.log("🔍 getRecordsByModule - Iniciando búsqueda");
    const { module } = req.params;
    const { page, limit, status, source } = req.query;
    
    console.log("🔍 getRecordsByModule - Parámetros:", { module, page, limit, status, source });
    
    // Construir filtros
    const filters: any = { module };
    if (status) filters.status = status;
    if (source) filters.source = source;
    
    console.log("🔍 getRecordsByModule - Filtros:", filters);
    
    let recordsList;
    let total;
    
    // Si no se especifica paginación, devolver todos los registros
    if (!page && !limit) {
      console.log("🔍 getRecordsByModule - Sin paginación, buscando todos los registros");
      recordsList = await records.find(filters)
        .populate('clientId', 'companyName fullName email')
        .populate('excelId', 'filename originalName')
        .populate('createdBy', 'name lastName email')
        .sort({ createdAt: -1 });
      
      total = recordsList.length;
      console.log("🔍 getRecordsByModule - Registros encontrados:", total);
    } else {
      // Usar paginación si se especifica
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const skip = (pageNum - 1) * limitNum;
      
      recordsList = await records.find(filters)
        .populate('clientId', 'companyName fullName email')
        .populate('excelId', 'filename originalName')
        .populate('createdBy', 'name lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);
      
      total = await records.countDocuments(filters);
    }
    
    console.log("🔍 getRecordsByModule - Enviando respuesta con", total, "registros");
    
    res.status(200).json({
      success: true,
      data: recordsList,
      pagination: {
        current: page ? parseInt(page as string) : 1,
        pages: limit ? Math.ceil(total / parseInt(limit as string)) : 1,
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving records",
      error: error instanceof Error ? error.message : error
    });
  }
};

export default getRecordsByModule;