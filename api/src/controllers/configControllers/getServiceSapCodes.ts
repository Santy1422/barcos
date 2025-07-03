import { Request, Response } from "express";
import ServiceSapCode from "../../database/schemas/serviceSapCodeSchema";

const getServiceSapCodes = async (req: Request, res: Response) => {
  try {
    const { module } = req.query;
    const filter: any = {};
    if (module) filter.module = { $in: [module, 'all'] };
    const codes = await ServiceSapCode.find(filter).sort({ code: 1 });
    res.json({ success: true, data: codes });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener códigos SAP", error });
  }
};

export default getServiceSapCodes; 