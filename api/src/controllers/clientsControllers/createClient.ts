import { clients } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    console.log("Datos recibidos:", req.body);
    console.log("Usuario autenticado:", req.user);
    
    // Validar que el código SAP sea único si se proporciona
    if (req.body.sapCode) {
      console.log("Buscando cliente con SAP:", req.body.sapCode);
      const existingClient = await clients.findOne({ sapCode: req.body.sapCode });
      console.log("Cliente existente encontrado:", existingClient);
      if (existingClient) {
        return response(res, 400, { error: "El código SAP ya está en uso" });
      }
    }
    
    // Agregar el usuario que crea el cliente
    const clientData = {
      ...req.body,
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
      if (error.keyPattern?.sapCode) {
        return response(res, 400, { error: "El código SAP ya está en uso" });
      }
      return response(res, 400, { error: "Cliente ya existe" });
    }
    return response(res, 500, { error: "Error al crear cliente" });
  }
};