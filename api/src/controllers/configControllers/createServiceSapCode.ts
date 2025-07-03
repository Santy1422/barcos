import { Request, Response } from "express";
import ServiceSapCode from "../../database/schemas/serviceSapCodeSchema";

const createServiceSapCode = async (req: Request, res: Response) => {
  try {
    const { code, description, module, active } = req.body;
    if (!code || !description) {
      return res.status(400).json({ success: false, message: "Código y descripción son requeridos" });
    }
    const exists = await ServiceSapCode.findOne({ code });
    if (exists) {
      return res.status(400).json({ success: false, message: "El código ya existe" });
    }
    const newCode = await ServiceSapCode.create({ code, description, module, active });
    res.status(201).json({ success: true, data: newCode });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear código SAP", error });
  }
};

export default createServiceSapCode; 