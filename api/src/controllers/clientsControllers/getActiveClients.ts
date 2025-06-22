import { clients } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const activeClients = await clients.find({ isActive: true }).sort({ createdAt: -1 });
    return response(res, 200, { clients: activeClients });
  } catch (error) {
    return response(res, 500, { error: "Error al obtener clientes activos" });
  }
};