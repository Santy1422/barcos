import { Request, Response } from "express";
import { invoices } from "../../database";

const getInvoicesByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const invoicesList = await invoices.find({ status })
      .populate('client', 'name email')
      .populate('createdBy', 'name lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await invoices.countDocuments({ status });
    
    res.status(200).json({
      success: true,
      data: invoicesList,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error("Error al obtener facturas por estado:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default getInvoicesByStatus;