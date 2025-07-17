import { Request, Response } from "express";
import { records } from "../../database";

const getAllRecords = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, module, status, source } = req.query;
    
    console.log("🔍 getAllRecords - Query params:", req.query)
    console.log("🔍 getAllRecords - Module:", module)
    console.log("🔍 getAllRecords - Status:", status)
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Construir filtros
    const filters: any = {};
    if (module) filters.module = module;
    if (status) filters.status = status;
    if (source) filters.source = source;
    
    console.log("🔍 getAllRecords - Filters:", filters)
    
    const recordsList = await records.find(filters)
      .populate('clientId', 'fullName companyName email')
      .populate('createdBy', 'name lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    console.log("🔍 getAllRecords - Records encontrados:", recordsList.length)
    
    const total = await records.countDocuments(filters);
    
    res.status(200).json({
      success: true,
      payload: recordsList,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error("❌ Error al obtener registros:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default getAllRecords;