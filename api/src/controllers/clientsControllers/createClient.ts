import { clients } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const client = await clients.create(req.body);
    return response(res, 201, { client });
  } catch (error) {
    if (error.code === 11000) {
      return response(res, 400, { error: "Cliente ya existe" });
    }
    return response(res, 500, { error: "Error al crear cliente" });
  }
};