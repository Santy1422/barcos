import { clients } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    console.log("Datos recibidos:", req.body);
    console.log("Usuario autenticado:", req.user);
    
    // Normalizar módulos: convertir string a array si es necesario
    let modules = req.body.module || ["ptyss"]; // Por defecto ["ptyss"]
    if (typeof modules === 'string') {
      modules = [modules]; // Convertir string único a array
    }
    
    // Normalizar SAP code: quitar espacios en blanco
    const normalizedSapCode = req.body.sapCode ? req.body.sapCode.trim() : undefined;
    
    // Validar que el código SAP sea único si se proporciona
    if (normalizedSapCode) {
      console.log("Buscando cliente con SAP:", normalizedSapCode);
      
      // Buscar con múltiples variantes de espacios para capturar duplicados
      const existingClient = await clients.findOne({ 
        $or: [
          { sapCode: normalizedSapCode },
          { sapCode: normalizedSapCode.toLowerCase() },
          { sapCode: normalizedSapCode.toUpperCase() }
        ]
      });
      console.log("Cliente existente encontrado:", existingClient);
      if (existingClient) {
        return response(res, 400, { error: "El código SAP ya está en uso. Use un código SAP único." });
      }
    }
    
    // Agregar el usuario que crea el cliente y los módulos
    const clientData = {
      ...req.body,
      sapCode: normalizedSapCode, // Usar el SAP code normalizado
      module: modules, // Array de módulos
      createdBy: req.user._id
    };
    
    console.log("Datos del cliente a crear:", clientData);
    
    const client = await clients.create(clientData);
    console.log("Cliente creado exitosamente:", client);
    return response(res, 201, { client });
  } catch (error) {
    console.error("Error al crear cliente:", error);
    console.error("Error details:", {
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      message: error.message
    });
    
    if (error.code === 11000) {
      return response(res, 400, { error: "Cliente ya existe (probablemente duplicado)" });
    }
    return response(res, 500, { error: "Error al crear cliente" });
  }
};