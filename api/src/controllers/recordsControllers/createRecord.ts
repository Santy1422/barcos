import { records } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const record = await records.create(req.body);
    return response(res, 201, { record });
  } catch (error) {
    return response(res, 500, { error: "Error al crear registro" });
  }
};