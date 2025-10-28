import { clients } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const { module } = req.query;
    
    // Construir query basado en el módulo si se especifica
    // Si module es un string, buscar clientes que incluyan ese módulo
    const query: any = {};
    if (module) {
      // Si module es un array, usar $in, si no, usar directamente
      if (Array.isArray(module)) {
        query.module = { $in: module };
      } else {
        query.module = module;
      }
    }
    
    const allClients = await clients.find(query).sort({ createdAt: -1 });
    return response(res, 200, { clients: allClients });
  } catch (error) {
    return response(res, 500, { error: "Error al obtener clientes" });
  }
};