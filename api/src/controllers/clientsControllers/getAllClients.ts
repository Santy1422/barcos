import { clients } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const allClients = await clients.find().sort({ createdAt: -1 });
    return response(res, 200, { clients: allClients });
  } catch (error) {
    return response(res, 500, { error: "Error al obtener clientes" });
  }
};