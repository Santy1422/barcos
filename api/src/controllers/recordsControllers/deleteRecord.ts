import { Request, Response } from "express";
import { records } from "../../database";

const deleteRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await records.findOne({ _id: id, deletedAt: null });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Registro no encontrado"
      });
    }

    const record = await records.findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date() } },
      { new: true }
    );

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