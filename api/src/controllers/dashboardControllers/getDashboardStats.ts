import { invoices, clients, records, excelFiles } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const [totalInvoices, totalClients, totalRecords, totalExcelFiles] = await Promise.all([
      invoices.countDocuments(),
      clients.countDocuments(),
      records.countDocuments(),
      excelFiles.countDocuments()
    ]);
    
    const revenueData = await invoices.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          avgInvoiceAmount: { $avg: "$totalAmount" }
        }
      }
    ]);
    
    const moduleStats = await invoices.aggregate([
      {
        $group: {
          _id: "$module",
          count: { $sum: 1 },
          revenue: { $sum: "$totalAmount" }
        }
      }
    ]);
    
    return response(res, 200, {
      totals: {
        invoices: totalInvoices,
        clients: totalClients,
        records: totalRecords,
        excelFiles: totalExcelFiles
      },
      revenue: revenueData[0] || { totalRevenue: 0, avgInvoiceAmount: 0 },
      moduleStats
    });
  } catch (error) {
    return response(res, 500, { error: "Error al obtener estadísticas del dashboard" });
  }
};