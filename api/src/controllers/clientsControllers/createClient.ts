import { clients } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    // Validar que el código SAP sea único si se proporciona
    if (req.body.sapCode) {
      const existingClient = await clients.findOne({ sapCode: req.body.sapCode });
      if (existingClient) {
        return response(res, 400, { error: "El código SAP ya está en uso" });
      }
    }
    
    const client = await clients.create(req.body);
    return response(res, 201, { client });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.sapCode) {
        return response(res, 400, { error: "El código SAP ya está en uso" });
      }
      return response(res, 400, { error: "Cliente ya existe" });
    }
    return response(res, 500, { error: "Error al crear cliente" });
  }
};