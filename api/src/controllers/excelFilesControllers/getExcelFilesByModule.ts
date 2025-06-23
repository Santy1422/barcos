import { Request, Response } from "express";
import { excelFiles } from "../../database";

const getExcelFilesByModule = async (req: Request, res: Response) => {
  try {
    const { module } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Construir filtros
    const filters: any = { module };
    if (status) filters.status = status;
        //@ts-ignore

    const excelFiles = await ExcelFile.find(filters)
      .populate('uploadedBy', 'name lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
        //@ts-ignore

    const total = await ExcelFile.countDocuments(filters);
    
    res.status(200).json({
      success: true,
      data: excelFiles,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error("Error al obtener archivos Excel por módulo:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default getExcelFilesByModule;