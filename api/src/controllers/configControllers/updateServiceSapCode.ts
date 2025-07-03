import { Request, Response } from "express";
import ServiceSapCode from "../../database/schemas/serviceSapCodeSchema";

const updateServiceSapCode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, description, module, active } = req.body;
    const updated = await ServiceSapCode.findByIdAndUpdate(
      id,
      { code, description, module, active },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Código SAP no encontrado" });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar código SAP", error });
  }
};

export default updateServiceSapCode; 