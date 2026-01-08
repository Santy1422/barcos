import { invoices, records } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const invoiceData = req.body;
    
    // Si hay servicios adicionales, calcular el total incluyéndolos
    if (invoiceData.additionalServices && invoiceData.additionalServices.length > 0) {
      const servicesTotal = invoiceData.additionalServices.reduce((sum, service) => {
        return sum + (service.amount || 0);
      }, 0);
      
      // Actualizar el total incluyendo servicios adicionales
      invoiceData.totalAmount = (invoiceData.totalAmount || 0) + servicesTotal;
    }
    
    // Validación de descuento - NUEVO (agregado 2026-01-08)
    const discountAmount = Math.max(0, invoiceData.discountAmount || 0);
    if (discountAmount > invoiceData.totalAmount) {
      return response(res, 400, { 
        error: "El descuento no puede ser mayor al total de la factura",
        details: {
          totalAmount: invoiceData.totalAmount,
          discountAmount: discountAmount
        }
      });
    }
    
    const invoice = await invoices.create(invoiceData);
    
    // Marcar los registros asociados como facturados
    if (invoiceData.relatedRecordIds && invoiceData.relatedRecordIds.length > 0) {
      console.log("🔍 createInvoice - Marcando registros como facturados:", invoiceData.relatedRecordIds);
      
      const updateResult = await records.updateMany(
        { _id: { $in: invoiceData.relatedRecordIds } },
        {
          $set: { 
            status: "facturado",
            invoiceId: invoice._id
          }
        }
      );
      
      console.log("🔍 createInvoice - Registros actualizados:", updateResult);
    }
    
    return response(res, 201, { invoice });
  } catch (error) {
    console.error("❌ Error al crear factura:", error);
    return response(res, 500, { error: "Error al crear factura" });
  }
};