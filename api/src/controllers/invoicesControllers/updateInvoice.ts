import { Request, Response } from "express";
import Invoice from "../../database/invoicesSchema";

const updateInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Agregar información de auditoría
    updateData.updatedBy = req.user?.id;
    updateData.updatedAt = new Date();
    
    const invoice = await Invoice.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('client', 'name email')
      .populate('updatedBy', 'name lastName email');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Factura no encontrada"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Factura actualizada exitosamente",
      data: invoice
    });
  } catch (error) {
    console.error("Error al actualizar factura:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default updateInvoice;