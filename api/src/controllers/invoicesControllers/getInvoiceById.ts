import { Request, Response } from "express";
import Invoice from "../../database/invoicesSchema";

const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const invoice = await Invoice.findById(id)
      .populate('client', 'name email')
      .populate('createdBy', 'name lastName email');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Factura no encontrada"
      });
    }
    
    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error("Error al obtener factura por ID:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default getInvoiceById;