import { invoices } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const invoice = await invoices.create(req.body);
    return response(res, 201, { invoice });
  } catch (error) {
    return response(res, 500, { error: "Error al crear factura" });
  }
};