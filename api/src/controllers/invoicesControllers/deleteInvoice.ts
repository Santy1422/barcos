import { Request, Response } from "express";
import { invoices } from "../../database";

const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const invoice = await invoices.findByIdAndDelete(id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Factura no encontrada"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Factura eliminada exitosamente",
      data: invoice
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