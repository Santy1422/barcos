import { Request, Response } from "express";
import { records, invoices, excelFiles } from "../../database";

const getModuleStats = async (req: Request, res: Response) => {
  try {
    // Get stats for each module
    const modules = ['agency', 'shipchandler', 'trucking'];
    const moduleStats = [];

    for (const module of modules) {
      // Count records by status
      const recordStats = await records.aggregate([
        { $match: { module } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Count invoices by status
      const invoiceStats = await invoices.aggregate([
        { $match: { module } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]);

      // Count excel files by status
      const excelStats = await excelFiles.aggregate([
        { $match: { module } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Calculate totals
      const totalRecords = recordStats.reduce((sum, stat) => sum + stat.count, 0);
      const totalInvoices = invoiceStats.reduce((sum, stat) => sum + stat.count, 0);
      const totalRevenue = invoiceStats.reduce((sum, stat) => sum + (stat.totalAmount || 0), 0);
      const totalExcelFiles = excelStats.reduce((sum, stat) => sum + stat.count, 0);

      moduleStats.push({
        module,
        records: {
          total: totalRecords,
          byStatus: recordStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {} as Record<string, number>)
        },
        invoices: {
          total: totalInvoices,
          totalRevenue,
          byStatus: invoiceStats.reduce((acc, stat) => {
            acc[stat._id] = {
              count: stat.count,
              amount: stat.totalAmount || 0
            };
            return acc;
          }, {} as Record<string, { count: number; amount: number }>)
        },
        excelFiles: {
          total: totalExcelFiles,
          byStatus: excelStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {} as Record<string, number>)
        }
      });
    }

    res.status(200).json({
      success: true,
      data: moduleStats
    });
  } catch (error) {
    console.error('Error getting module stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener estadísticas de módulos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default getModuleStats;