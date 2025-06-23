import { Request, Response } from "express";
import { records } from "../../database";

const deleteRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const record = await records.findByIdAndDelete(id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Registro no encontrado"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Registro eliminado exitosamente",
      data: record
    });
  } catch (error) {
    console.error("Error al eliminar registro:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default deleteRecord;