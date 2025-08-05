import { Request, Response } from "express";
import { invoices } from "../../database";

const markXmlAsSentToSap = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Marcando XML como enviado a SAP para factura: ${id}`);
    
    // Buscar la factura actual
    const currentInvoice = await invoices.findById(id);
    
    if (!currentInvoice) {
      return res.status(404).json({
        success: false,
        message: "Factura no encontrada"
      });
    }
    
    // Verificar que tenga xmlData
    if (!currentInvoice.xmlData) {
      return res.status(400).json({
        success: false,
        message: "La factura no tiene XML generado"
      });
    }
    
    // Preparar xmlData actualizado
    const sentToSapAt = new Date().toISOString();
    
    console.log("🔍 xmlData actual:", JSON.stringify(currentInvoice.xmlData, null, 2));
    
    // Crear xmlData de forma más explícita
    const updatedXmlData = {
      xml: currentInvoice.xmlData.xml || "",
      isValid: currentInvoice.xmlData.isValid || false,
      generatedAt: currentInvoice.xmlData.generatedAt || new Date().toISOString(),
      sentToSap: true,
      sentToSapAt: sentToSapAt
    };
    
    console.log("🔍 xmlData a actualizar:", JSON.stringify(updatedXmlData, null, 2));
    
    // Primero, intentar actualizar solo el campo sentToSap
    console.log("🔄 Actualizando campos SAP...");
    const updatedInvoice = await invoices.findByIdAndUpdate(
      id,
      { 
        $set: { 
          "xmlData.sentToSap": true,
          "xmlData.sentToSapAt": sentToSapAt,
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: false }
    );
    
    if (!updatedInvoice) {
      return res.status(404).json({
        success: false,
        message: "Error al actualizar la factura"
      });
    }
    
    console.log("✅ XML marcado como enviado a SAP exitosamente");
    
    res.status(200).json({
      success: true,
      message: "XML marcado como enviado a SAP exitosamente",
      data: updatedInvoice,
      sentToSapAt: sentToSapAt
    });
    
  } catch (error: any) {
    console.error("❌ Error al marcar XML como enviado a SAP:", error);
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

export default markXmlAsSentToSap;