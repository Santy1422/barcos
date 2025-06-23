import { Request, Response } from "express";
import { excelFiles } from "../../database";

const getAllExcelFiles = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, module, status } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Construir filtros
    const filters: any = {};
    if (module) filters.module = module;
    if (status) filters.status = status;
    
    const excelFilesList = await excelFiles.find(filters)
      .populate('uploadedBy', 'name lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await excelFiles.countDocuments(filters);
    
    res.status(200).json({
      success: true,
      data: excelFilesList,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error("Error al obtener archivos Excel:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default getAllExcelFiles;