import { invoices } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const { module } = req.params;
    const moduleInvoices = await invoices.find({ module }).sort({ createdAt: -1 });
    return response(res, 200, { invoices: moduleInvoices });
  } catch (error) {
    return response(res, 500, { error: "Error al obtener facturas por módulo" });
  }
};