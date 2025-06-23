import { Request, Response } from "express";
import { records } from "../../database";

const getRecordById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const record = await records.findById(id)
      .populate('client', 'name email phone')
      .populate('excelFile', 'filename originalName uploadedAt')
      .populate('createdBy', 'name lastName email')
      .populate('updatedBy', 'name lastName email');
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Registro no encontrado"
      });
    }
    
    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error("Error al obtener registro por ID:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default getRecordById;