import { Request, Response } from "express";
import fs from "fs";
import { excelFiles } from "../../database";

const deleteExcelFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const excelFile = await excelFiles.findById(id);
    
    if (!excelFile) {
      return res.status(404).json({
        success: false,
        message: "Archivo Excel no encontrado"
      });
    }
    
    // Eliminar archivo físico
    //@ts-ignore
    if (fs.existsSync(excelFile.path)) {
          //@ts-ignore

      fs.unlinkSync(excelFile.path);
    }
    
    // Eliminar registro de la base de datos
    await excelFiles.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: "Archivo Excel eliminado exitosamente",
      data: excelFile
    });
  } catch (error) {
    console.error("Error al eliminar archivo Excel:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default deleteExcelFile;