import { Request, Response } from "express";
import { excelFiles } from "../../database";

const getExcelFileById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const excelFile = await excelFiles.findById(id)
      .populate('uploadedBy', 'name lastName email');
    
    if (!excelFile) {
      return res.status(404).json({
        success: false,
        message: "Archivo Excel no encontrado"
      });
    }
    
    res.status(200).json({
      success: true,
      data: excelFile
    });
  } catch (error) {
    console.error("Error al obtener archivo Excel por ID:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default getExcelFileById;