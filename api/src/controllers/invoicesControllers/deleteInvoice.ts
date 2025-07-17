import { Request, Response } from "express";
import { invoices, records } from "../../database";

const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Primero obtener la factura para acceder a los registros asociados
    const invoice = await invoices.findById(id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Factura no encontrada"
      });
    }
    
    // Liberar los registros asociados: cambiar estado de "facturado" a pendiente"
    // y eliminar la referencia a la factura
    if (invoice.relatedRecordIds && invoice.relatedRecordIds.length > 0) {
      await records.updateMany(
        {
          _id: { $in: invoice.relatedRecordIds },
          status: "facturado",
          invoiceId: id
        },
        {
          $set: { 
            status: "pendiente",
            invoiceId: null
          }
        }
      );
      
      console.log(`✅ Liberados ${invoice.relatedRecordIds.length} registros asociados a la factura ${id}`);
    }
    
    // Eliminar la factura
    await invoices.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: "Factura eliminada exitosamente y registros liberados",
      data: {
        invoice,
        recordsFreed: invoice.relatedRecordIds?.length || 0
      }
    });
  } catch (error) {
    console.error("Error al eliminar factura:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default deleteInvoice;