import { Request, Response } from "express";
import ServiceSapCode from "../../database/schemas/serviceSapCodeSchema";

const deleteServiceSapCode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await ServiceSapCode.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Código SAP no encontrado" });
    }
    res.json({ success: true, message: "Código SAP eliminado" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar código SAP", error });
  }
};

export default deleteServiceSapCode; 