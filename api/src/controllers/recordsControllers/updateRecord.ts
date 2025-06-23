import { Request, Response } from "express";
import { records } from "../../database";

const updateRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Agregar información de auditoría
        // @ts-ignore

    updateData.updatedBy = req.user?.id;
    updateData.updatedAt = new Date();
    
    const record = await records.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('client', 'name email')
      .populate('excelFile', 'filename originalName')
      .populate('updatedBy', 'name lastName email');
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Registro no encontrado"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Registro actualizado exitosamente",
      data: record
    });
  } catch (error) {
    console.error("Error al actualizar registro:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default updateRecord;