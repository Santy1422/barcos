import { clients } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const { id } = req.params;
    
    // Normalizar SAP code si está presente en el body
    const updateData = { ...req.body };
    if (updateData.sapCode && typeof updateData.sapCode === 'string') {
      updateData.sapCode = updateData.sapCode.trim();
    }
    
    const client = await clients.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!client) {
      return response(res, 404, { error: "Cliente no encontrado" });
    }
    
    return response(res, 200, { client });
  } catch (error) {
    return response(res, 500, { error: "Error al actualizar cliente" });
  }
};