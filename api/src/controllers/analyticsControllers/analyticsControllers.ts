import { Request, Response } from 'express';
import { clients, invoices, records, agencyServices, agencyInvoices, users } from '../../database';

// Helper para parsear fechas de query params
const parseDateRange = (req: Request) => {
  const { startDate, endDate } = req.query;
  const dateFilter: any = {};

  if (startDate) {
    dateFilter.$gte = new Date(startDate as string);
  }
  if (endDate) {
    dateFilter.$lte = new Date(endDate as string);
  }

  return Object.keys(dateFilter).length > 0 ? dateFilter : null;
};

// GET /api/analytics/metrics - KPIs principales
export const getMetricsSummary = async (req: Request, res: Response) => {
  try {
    // Obtener totales de facturas
    const invoiceStats = await invoices.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalInvoices: { $sum: 1 },
          pendingInvoices: {
            $sum: { $cond: [{ $eq: ['$status', 'prefactura'] }, 1, 0] }
          },
          completedInvoices: {
            $sum: { $cond: [{ $eq: ['$status', 'facturada'] }, 1, 0] }
          }
        }
      }
    ]);

    // Obtener totales de Agency Invoices
    const agencyInvoiceStats = await agencyInvoices.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalInvoices: { $sum: 1 }
        }
      }
    ]);

    // Contar clientes activos
    const activeClients = await clients.countDocuments({ isActive: true });
    const totalClients = await clients.countDocuments({});

    // Contar registros
    const totalRecords = await records.countDocuments({});

    // Combinar revenues
    const moduleRevenue = invoiceStats[0]?.totalRevenue || 0;
    const agencyRevenue = agencyInvoiceStats[0]?.totalRevenue || 0;
    const totalRevenue = moduleRevenue + agencyRevenue;

    return res.json({
      success: true,
      data: {
        totalRevenue,
        totalTransactions: (invoiceStats[0]?.totalInvoices || 0) + (agencyInvoiceStats[0]?.totalInvoices || 0),
        activeClients,
        totalClients,
        invoicesCreated: (invoiceStats[0]?.totalInvoices || 0) + (agencyInvoiceStats[0]?.totalInvoices || 0),
        pendingInvoices: invoiceStats[0]?.pendingInvoices || 0,
        completedInvoices: invoiceStats[0]?.completedInvoices || 0,
        totalRecords
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getMetricsSummary:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/analytics/revenue - Revenue por módulo
export const getRevenueAnalytics = async (req: Request, res: Response) => {
  try {
    // Revenue por módulo desde invoices
    const moduleRevenue = await invoices.aggregate([
      {
        $group: {
          _id: '$module',
          totalRevenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Revenue de Agency
    const agencyRevenueResult = await agencyInvoices.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Formatear respuesta
    const byModule: any = {
      trucking: 0,
      ptyss: 0,
      shipchandler: 0,
      agency: agencyRevenueResult[0]?.totalRevenue || 0
    };

    moduleRevenue.forEach((item: any) => {
      if (item._id && byModule.hasOwnProperty(item._id)) {
        byModule[item._id] = item.totalRevenue;
      }
    });

    const total = Object.values(byModule).reduce((sum: number, val: any) => sum + val, 0);

    // Timeline de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const timeline = await invoices.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          amount: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.json({
      success: true,
      data: {
        byModule,
        total,
        timeline: timeline.map((t: any) => ({ date: t._id, amount: t.amount }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getRevenueAnalytics:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/analytics/operational - Métricas operacionales
export const getOperationalMetrics = async (req: Request, res: Response) => {
  try {
    // Calcular tasas de completación por módulo
    const invoicesByStatus = await invoices.aggregate([
      {
        $group: {
          _id: { module: '$module', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Calcular eficiencia general
    const totalInvoices = await invoices.countDocuments({});
    const completedInvoices = await invoices.countDocuments({ status: 'facturada' });
    const overallCompletionRate = totalInvoices > 0 ? completedInvoices / totalInvoices : 0;

    // Calcular por módulo
    const moduleStats: any = {};
    invoicesByStatus.forEach((item: any) => {
      if (!moduleStats[item._id.module]) {
        moduleStats[item._id.module] = { total: 0, completed: 0 };
      }
      moduleStats[item._id.module].total += item.count;
      if (item._id.status === 'facturada') {
        moduleStats[item._id.module].completed += item.count;
      }
    });

    const truckingEfficiency = moduleStats.trucking
      ? moduleStats.trucking.completed / moduleStats.trucking.total
      : 0;

    const ptyssEfficiency = moduleStats.ptyss
      ? moduleStats.ptyss.completed / moduleStats.ptyss.total
      : 0;

    // Agency efficiency
    const totalAgency = await agencyServices.countDocuments({});
    const completedAgency = await agencyServices.countDocuments({ status: 'completed' });
    const agencyEfficiency = totalAgency > 0 ? completedAgency / totalAgency : 0;

    return res.json({
      success: true,
      data: {
        overallCompletionRate,
        truckingEfficiency,
        ptyssEfficiency,
        agencyEfficiency,
        averageProcessingTime: 24, // Placeholder - calcular si hay timestamps
        moduleStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getOperationalMetrics:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/analytics/trucking - Analytics de Trucking/PTG
export const getTruckingAnalytics = async (req: Request, res: Response) => {
  try {
    const stats = await invoices.aggregate([
      { $match: { module: 'trucking' } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalRecords = await records.countDocuments({ module: 'Trucking' });
    const totalRevenue = stats.reduce((sum: number, s: any) => sum + (s.revenue || 0), 0);
    const totalInvoices = stats.reduce((sum: number, s: any) => sum + s.count, 0);

    const byStatus: any = {};
    stats.forEach((s: any) => {
      byStatus[s._id] = s.count;
    });

    return res.json({
      success: true,
      data: {
        totalRecords,
        totalRevenue,
        totalInvoices,
        byStatus,
        recentRecords: []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getTruckingAnalytics:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/analytics/ptyss - Analytics de PTYSS
export const getPTYSSAnalytics = async (req: Request, res: Response) => {
  try {
    const stats = await invoices.aggregate([
      { $match: { module: 'ptyss' } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalRecords = await records.countDocuments({ module: 'PTYSS' });
    const totalRevenue = stats.reduce((sum: number, s: any) => sum + (s.revenue || 0), 0);
    const totalInvoices = stats.reduce((sum: number, s: any) => sum + s.count, 0);

    const byStatus: any = {};
    stats.forEach((s: any) => {
      byStatus[s._id] = s.count;
    });

    return res.json({
      success: true,
      data: {
        totalRecords,
        totalRevenue,
        totalInvoices,
        byStatus,
        recentRecords: []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getPTYSSAnalytics:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/analytics/shipchandler - Analytics de ShipChandler
export const getShipChandlerAnalytics = async (req: Request, res: Response) => {
  try {
    const stats = await invoices.aggregate([
      { $match: { module: 'shipchandler' } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalRecords = await records.countDocuments({ module: 'ShipChandler' });
    const totalRevenue = stats.reduce((sum: number, s: any) => sum + (s.revenue || 0), 0);
    const totalInvoices = stats.reduce((sum: number, s: any) => sum + s.count, 0);

    const byStatus: any = {};
    stats.forEach((s: any) => {
      byStatus[s._id] = s.count;
    });

    return res.json({
      success: true,
      data: {
        totalRecords,
        totalRevenue,
        totalInvoices,
        byStatus,
        recentRecords: []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getShipChandlerAnalytics:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/analytics/agency - Analytics de Agency
export const getAgencyAnalytics = async (req: Request, res: Response) => {
  try {
    // Stats de servicios
    const serviceStats = await agencyServices.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Stats de facturas
    const invoiceStats = await agencyInvoices.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalServices = await agencyServices.countDocuments({});
    const totalRevenue = invoiceStats.reduce((sum: number, s: any) => sum + (s.revenue || 0), 0);
    const totalInvoices = invoiceStats.reduce((sum: number, s: any) => sum + s.count, 0);

    const byStatus: any = {};
    serviceStats.forEach((s: any) => {
      byStatus[s._id] = s.count;
    });

    return res.json({
      success: true,
      data: {
        totalRecords: totalServices,
        totalRevenue,
        totalInvoices,
        byStatus,
        recentRecords: []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getAgencyAnalytics:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/analytics/clients - Analytics de clientes
export const getClientAnalytics = async (req: Request, res: Response) => {
  try {
    const total = await clients.countDocuments({});
    const totalActive = await clients.countDocuments({ isActive: true });

    // Clientes nuevos este mes
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newThisMonth = await clients.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Clientes por tipo
    const byType = await clients.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    return res.json({
      success: true,
      data: {
        total,
        totalActive,
        inactive: total - totalActive,
        newThisMonth,
        byType: byType.reduce((acc: any, t: any) => {
          acc[t._id || 'unknown'] = t.count;
          return acc;
        }, {})
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getClientAnalytics:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/analytics/invoices - Analytics de facturas
export const getInvoiceAnalytics = async (req: Request, res: Response) => {
  try {
    // Stats de invoices generales
    const generalStats = await invoices.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Stats de agency invoices
    const agencyStats = await agencyInvoices.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const total = generalStats.reduce((sum: number, s: any) => sum + s.count, 0) +
                  agencyStats.reduce((sum: number, s: any) => sum + s.count, 0);

    const totalAmount = generalStats.reduce((sum: number, s: any) => sum + (s.amount || 0), 0) +
                        agencyStats.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);

    const pending = generalStats.find((s: any) => s._id === 'prefactura')?.count || 0;
    const completed = generalStats.find((s: any) => s._id === 'facturada')?.count || 0;

    // Por módulo
    const byModule = await invoices.aggregate([
      {
        $group: {
          _id: '$module',
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      }
    ]);

    return res.json({
      success: true,
      data: {
        total,
        totalAmount,
        pending,
        completed,
        byModule: byModule.reduce((acc: any, m: any) => {
          acc[m._id || 'unknown'] = { count: m.count, amount: m.amount };
          return acc;
        }, {}),
        byStatus: {
          prefactura: pending,
          facturada: completed
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getInvoiceAnalytics:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
