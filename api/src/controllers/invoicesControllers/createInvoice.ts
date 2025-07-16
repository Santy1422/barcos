import { invoices } from "../../database";
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
    
    const invoice = await invoices.create(invoiceData);
    return response(res, 201, { invoice });
  } catch (error) {
    return response(res, 500, { error: "Error al crear factura" });
  }
};