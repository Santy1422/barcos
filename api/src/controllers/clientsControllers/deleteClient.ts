import { clients } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const { id } = req.params;
    const client = await clients.findByIdAndDelete(id);
    
    if (!client) {
      return response(res, 404, { error: "Cliente no encontrado" });
    }
    
    return response(res, 200, { message: "Cliente eliminado correctamente" });
  } catch (error) {
    return response(res, 500, { error: "Error al eliminar cliente" });
  }
};