import { Request, Response } from "express";
import { records } from "../../database";

const getRecordsByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 10, module, source } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Construir filtros
    const filters: any = { status };
    if (module) filters.module = module;
    if (source) filters.source = source;
    
    const records2 = await records.find(filters)
      .populate('clientId', 'name email')
      .populate('excelId', 'filename originalName')
      .populate('createdBy', 'name lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await records.countDocuments(filters);
    
    res.status(200).json({
      success: true,
      data: records2,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error("Error al obtener registros por estado:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default getRecordsByStatus;