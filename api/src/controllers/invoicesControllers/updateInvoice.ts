import { Request, Response } from "express";
import { invoices } from "../../database";

const updateInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Validación de descuento - NUEVO (agregado 2026-01-08)
    if (updateData.discountAmount !== undefined && updateData.totalAmount !== undefined) {
      const discountAmount = Math.max(0, updateData.discountAmount || 0);
      if (discountAmount > updateData.totalAmount) {
        return res.status(400).json({
          success: false,
          error: "El descuento no puede ser mayor al total de la factura",
          details: {
            totalAmount: updateData.totalAmount,
            discountAmount: discountAmount
          }
        });
      }
    }
    
    // Agregar información de auditoría
    // @ts-ignore
    updateData.updatedBy = req.user?.id;
    updateData.updatedAt = new Date();
    
    const invoice = await invoices.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
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