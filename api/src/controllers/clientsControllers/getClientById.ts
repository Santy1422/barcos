import { clients } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const { id } = req.params;
    const client = await clients.findById(id);
    
    if (!client) {
      return response(res, 404, { error: "Cliente no encontrado" });
    }
    
    return response(res, 200, { client });
  } catch (error) {
    return response(res, 500, { error: "Error al obtener cliente" });
  }
};