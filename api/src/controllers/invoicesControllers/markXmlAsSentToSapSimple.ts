import { Request, Response } from "express";
import { invoices } from "../../database";

const markXmlAsSentToSapSimple = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 [SIMPLE] Marcando XML como enviado a SAP para factura: ${id}`);
    
    // Buscar la factura actual
    const currentInvoice = await invoices.findById(id);
    
    if (!currentInvoice) {
      return res.status(404).json({
        success: false,
        message: "Factura no encontrada"
      });
    }
    
    console.log("🔍 [SIMPLE] Factura encontrada:", {
      id: currentInvoice._id,
      invoiceNumber: currentInvoice.invoiceNumber,
      hasXmlData: !!currentInvoice.xmlData
    });
    
    // Verificar que tenga xmlData
    if (!currentInvoice.xmlData) {
      return res.status(400).json({
        success: false,
        message: "La factura no tiene XML generado"
      });
    }
    
    const sentToSapAt = new Date();
    
    // Estrategia 1: Actualización con operador $set usando notación de punto
    console.log("🔄 [SIMPLE] Estrategia 1: Actualizando usando notación de punto...");
    
    try {
      const result1 = await invoices.updateOne(
        { _id: id },
        { 
          $set: { 
            "xmlData.sentToSap": true,
            "xmlData.sentToSapAt": sentToSapAt,
            updatedAt: new Date()
          }
        }
      );
      
      console.log("✅ [SIMPLE] Resultado updateOne:", result1);
      
      if (result1.modifiedCount > 0) {
        // Obtener la factura actualizada
        const updatedInvoice = await invoices.findById(id);
        
        return res.status(200).json({
          success: true,
          message: "XML marcado como enviado a SAP exitosamente (Estrategia 1)",
          data: updatedInvoice,
          sentToSapAt: sentToSapAt.toISOString(),
          strategy: "updateOne_dotNotation"
        });
      }
    } catch (error1) {
      console.log("❌ [SIMPLE] Error en Estrategia 1:", error1);
    }
    
    // Estrategia 2: Reconstruir objeto xmlData completamente
    console.log("🔄 [SIMPLE] Estrategia 2: Reconstruyendo xmlData completo...");
    
    try {
      const currentXmlData = currentInvoice.xmlData.toObject ? 
        currentInvoice.xmlData.toObject() : 
        currentInvoice.xmlData;
      
      const newXmlData = {
        ...currentXmlData,
        sentToSap: true,
        sentToSapAt: sentToSapAt.toISOString()
      };
      
      console.log("🔍 [SIMPLE] Nuevo xmlData:", JSON.stringify(newXmlData, null, 2));
      
      const result2 = await invoices.updateOne(
        { _id: id },
        { 
          $set: { 
            xmlData: newXmlData,
            updatedAt: new Date()
          }
        }
      );
      
      console.log("✅ [SIMPLE] Resultado updateOne (Estrategia 2):", result2);
      
      if (result2.modifiedCount > 0) {
        const updatedInvoice = await invoices.findById(id);
        
        return res.status(200).json({
          success: true,
          message: "XML marcado como enviado a SAP exitosamente (Estrategia 2)",
          data: updatedInvoice,
          sentToSapAt: sentToSapAt.toISOString(),
          strategy: "updateOne_fullObject"
        });
      }
    } catch (error2) {
      console.log("❌ [SIMPLE] Error en Estrategia 2:", error2);
    }
    
    // Si llegamos aquí, ninguna estrategia funcionó
    return res.status(500).json({
      success: false,
      message: "No se pudo actualizar el estado SAP con ninguna estrategia",
      attempts: ["updateOne_dotNotation", "updateOne_fullObject"]
    });
    
  } catch (error: any) {
    console.error("❌ [SIMPLE] Error general:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: {
        name: error.name,
        message: error.message
      }
    });
  }
};

export default markXmlAsSentToSapSimple;