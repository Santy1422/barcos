import { Request, Response } from "express";
import { invoices, records, excelFiles } from "../../database";

const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit as string);

    // Get recent invoices
    const recentInvoices = await invoices.find()
      .populate('client', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(Math.floor(limitNum / 3))
      .select('invoiceNumber totalAmount status createdAt client createdBy');

    // Get recent records
    const recentRecords = await records.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(Math.floor(limitNum / 3))
      .select('module status createdAt createdBy');

    // Get recent excel files
    const recentExcelFiles = await excelFiles.find()
      .populate('uploadedBy', 'name')
      .sort({ uploadedAt: -1 })
      .limit(Math.floor(limitNum / 3))
      .select('filename status uploadedAt uploadedBy module');

    // Combine and sort all activities
    const activities = [
      ...recentInvoices.map(invoice => ({
        type: 'invoice',
        id: invoice._id,
        title: `Factura ${invoice.invoiceNumber}`,
        description: `Monto: $${invoice.totalAmount}`,
        status: invoice.status,
        date: invoice.createdAt,
        //@ts-ignore
        user: invoice.createdBy?.name || 'Usuario desconocido',
                //@ts-ignore

        client: invoice.client?.name
      })),
      ...recentRecords.map(record => ({
        type: 'record',
        id: record._id,
        title: `Registro ${record.module}`,
        description: `Estado: ${record.status}`,
        status: record.status,
        date: record.createdAt,
                //@ts-ignore

        user: record.createdBy?.name || 'Usuario desconocido'
      })),
      ...recentExcelFiles.map(file => ({
        type: 'excel',
        id: file._id,
        title: `Archivo ${file.filename}`,
        description: `Módulo: ${file.module}`,
        status: file.status,
                //@ts-ignore

        date: file.uploadedAt,
                //@ts-ignore

        user: file.uploadedBy?.name || 'Usuario desconocido'
      }))
    ];

    // Sort by date and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limitNum);

    res.status(200).json({
      success: true,
      data: sortedActivities,
      total: sortedActivities.length
    });
  } catch (error) {
    console.error('Error getting recent activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener actividad reciente',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default getRecentActivity;