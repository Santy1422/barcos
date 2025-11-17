import { clients } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const { module } = req.query;
    
    // Construir query basado en el módulo si se especifica
    // Buscar clientes que tengan el módulo en su array de módulos
    const query: any = {};
    if (module) {
      // Si module es un array, buscar clientes que tengan cualquiera de esos módulos
      if (Array.isArray(module)) {
        query.module = { $in: module };
      } else {
        // Si es un string, buscar clientes que incluyan ese módulo en su array usando $in
        query.module = { $in: [module] };
      }
    }
    
    const allClients = await clients.find(query).sort({ createdAt: -1 });
    return response(res, 200, { clients: allClients });
  } catch (error) {
    return response(res, 500, { error: "Error al obtener clientes" });
  }
};