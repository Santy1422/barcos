import { Request, Response } from "express";
import { excelFiles } from "../../database";

const getExcelFilesByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 10, module } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Construir filtros
    const filters: any = { status };
    if (module) filters.module = module;
        //@ts-ignore

    const excelFiless = await excelFiles.find(filters)
      .populate('uploadedBy', 'name lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
        //@ts-ignore

    const total = await excelFiles.countDocuments(filters);
    
    res.status(200).json({
      success: true,
      data: excelFiless,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error("Error al obtener archivos Excel por estado:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default getExcelFilesByStatus;