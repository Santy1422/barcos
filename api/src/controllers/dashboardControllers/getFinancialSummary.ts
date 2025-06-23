import { Request, Response } from "express";
import { invoices } from "../../database";

const getFinancialSummary = async (req: Request, res: Response) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get financial summary
    const financialSummary = await invoices.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalInvoices: { $sum: 1 },
          averageInvoiceAmount: { $avg: '$totalAmount' },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$totalAmount', 0]
            }
          },
          overdueAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'overdue'] }, '$totalAmount', 0]
            }
          }
        }
      }
    ]);

    // Get revenue by module
    const revenueByModule = await invoices.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$module',
          revenue: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 }
        }
      },
      {
        $sort: { revenue: -1 }
      }
    ]);

    // Get revenue by client (top 10)
    const revenueByClient = await invoices.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$client',
          revenue: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'clientInfo'
        }
      },
      {
        $unwind: '$clientInfo'
      },
      {
        $project: {
          clientName: '$clientInfo.name',
          revenue: 1,
          invoiceCount: 1
        }
      },
      {
        $sort: { revenue: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get daily revenue trend for the period
    const dailyRevenue = await invoices.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    const summary = financialSummary[0] || {
      totalRevenue: 0,
      totalInvoices: 0,
      averageInvoiceAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0
    };

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        summary: {
          ...summary,
          collectionRate: summary.totalRevenue > 0 ? (summary.paidAmount / summary.totalRevenue) * 100 : 0
        },
        revenueByModule: revenueByModule.map(item => ({
          module: item._id,
          revenue: item.revenue,
          invoiceCount: item.invoiceCount
        })),
        topClients: revenueByClient,
        dailyTrend: dailyRevenue.map(item => ({
          date: new Date(item._id.year, item._id.month - 1, item._id.day),
          revenue: item.revenue,
          invoiceCount: item.invoiceCount
        }))
      }
    });
  } catch (error) {
    console.error('Error getting financial summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener resumen financiero',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default getFinancialSummary;