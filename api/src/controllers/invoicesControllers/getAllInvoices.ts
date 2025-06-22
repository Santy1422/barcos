import { invoices } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const allInvoices = await invoices.find().sort({ createdAt: -1 });
    return response(res, 200, { invoices: allInvoices });
  } catch (error) {
    return response(res, 500, { error: "Error al obtener facturas" });
  }
};