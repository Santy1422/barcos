import { clients } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const { sapCode } = req.query;
    
    if (!sapCode) {
      return response(res, 400, { error: "sapCode es requerido" });
    }
    
    // Normalizar SAP code: quitar espacios en blanco
    const normalizedSapCode = typeof sapCode === 'string' ? sapCode.trim() : String(sapCode).trim();
    
    // Buscar cliente por SAP code (sin filtrar por módulo)
    // Buscar con múltiples variantes para capturar diferentes formatos
    const client = await clients.findOne({
      $or: [
        { sapCode: normalizedSapCode },
        { sapCode: normalizedSapCode.toLowerCase() },
        { sapCode: normalizedSapCode.toUpperCase() }
      ]
    });
    
    if (!client) {
      return response(res, 404, { error: "Cliente no encontrado" });
    }
    
    return response(res, 200, { client });
  } catch (error) {
    console.error("Error al buscar cliente por SAP code:", error);
    return response(res, 500, { error: "Error al buscar cliente" });
  }
};

