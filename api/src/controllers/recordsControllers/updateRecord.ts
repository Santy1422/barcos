import { Request, Response } from "express";
import { records } from "../../database";

const updateRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log("🔍 updateRecord - ID:", id);
    console.log("🔍 updateRecord - updateData:", updateData);
    
    // Agregar información de auditoría
    updateData.updatedAt = new Date();
    
    console.log("🔍 updateRecord - updateData final:", updateData);
    
    const record = await records.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('clientId', 'companyName fullName email')
      .populate('excelId', 'filename originalName');
    
    if (!record) {
      console.log("🔍 updateRecord - Registro no encontrado");
      return res.status(404).json({
        success: false,
        message: "Registro no encontrado"
      });
    }
    
    console.log("🔍 updateRecord - Registro actualizado exitosamente:", record._id);
    
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