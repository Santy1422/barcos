import { Request, Response } from 'express';
import { clients, invoices, records, agencyServices, agencyInvoices, users } from '../../database';
import * as XLSX from 'xlsx';

// Helper para parsear fechas de query params
const parseDateFilter = (req: Request) => {
  const { startDate, endDate, month, year } = req.query;
  const filter: any = {};

  // Si se especifica mes y año
  if (month && year) {
    const monthNum = parseInt(month as string) - 1; // 0-indexed
    const yearNum = parseInt(year as string);
    const start = new Date(yearNum, monthNum, 1);
    const end = new Date(yearNum, monthNum + 1, 0, 23, 59, 59);
    filter.createdAt = { $gte: start, $lte: end };
  }
  // Si se especifican fechas directas
  else if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate as string);
    if (endDate) filter.createdAt.$lte = new Date(endDate as string);
  }

  return filter;
};

// GET /api/analytics/metrics - KPIs principales
export const getMetricsSummary = async (req: Request, res: Response) => {
  try {
    const dateFilter = parseDateFilter(req);
    const matchStage = Object.keys(dateFilter).length > 0 ? { $match: dateFilter } : null;

    // Pipeline base para invoices
    const invoicePipeline: any[] = [];
    if (matchStage) invoicePipeline.push(matchStage);
    invoicePipeline.push({
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
    });

    const invoiceStats = await invoices.aggregate(invoicePipeline);

    // Agency invoices
    const agencyPipeline: any[] = [];
    if (matchStage) agencyPipeline.push(matchStage);
    agencyPipeline.push({
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalInvoices: { $sum: 1 }
      }
    });

    const agencyInvoiceStats = await agencyInvoices.aggregate(agencyPipeline);

    // Contar clientes activos
    const activeClients = await clients.countDocuments({ isActive: true });
    const totalClients = await clients.countDocuments({});

    // Contar registros
    const recordsFilter = Object.keys(dateFilter).length > 0 ? dateFilter : {};
    const totalRecords = await records.countDocuments(recordsFilter);

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
      filters: {
        startDate: req.query.startDate || null,
        endDate: req.query.endDate || null,
        month: req.query.month || null,
        year: req.query.year || null
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
    const dateFilter = parseDateFilter(req);
    const matchStage = Object.keys(dateFilter).length > 0 ? { $match: dateFilter } : null;

    // Revenue por módulo desde invoices
    const modulePipeline: any[] = [];
    if (matchStage) modulePipeline.push(matchStage);
    modulePipeline.push({
      $group: {
        _id: '$module',
        totalRevenue: { $sum: '$totalAmount' },
        count: { $sum: 1 }
      }
    });

    const moduleRevenue = await invoices.aggregate(modulePipeline);

    // Revenue de Agency
    const agencyPipeline: any[] = [];
    if (matchStage) agencyPipeline.push(matchStage);
    agencyPipeline.push({
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        count: { $sum: 1 }
      }
    });

    const agencyRevenueResult = await agencyInvoices.aggregate(agencyPipeline);

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

    // Timeline - últimos 30 días o según filtro
    let timelineMatch: any = {};
    if (Object.keys(dateFilter).length > 0) {
      timelineMatch = dateFilter;
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      timelineMatch = { createdAt: { $gte: thirtyDaysAgo } };
    }

    const timeline = await invoices.aggregate([
      { $match: timelineMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          amount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Monthly breakdown
    const monthlyBreakdown = await invoices.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          amount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    return res.json({
      success: true,
      data: {
        byModule,
        total,
        timeline: timeline.map((t: any) => ({ date: t._id, amount: t.amount, count: t.count })),
        monthlyBreakdown: monthlyBreakdown.map((m: any) => ({
          year: m._id.year,
          month: m._id.month,
          amount: m.amount,
          count: m.count
        }))
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
    const dateFilter = parseDateFilter(req);

    // Calcular tasas de completación por módulo
    const matchStage = Object.keys(dateFilter).length > 0 ? dateFilter : {};

    const invoicesByStatus = await invoices.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: { module: '$module', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Calcular eficiencia general
    const totalInvoices = await invoices.countDocuments(matchStage);
    const completedInvoices = await invoices.countDocuments({ ...matchStage, status: 'facturada' });
    const overallCompletionRate = totalInvoices > 0 ? completedInvoices / totalInvoices : 0;

    // Calcular por módulo
    const moduleStats: any = {};
    invoicesByStatus.forEach((item: any) => {
      const mod = item._id.module || 'unknown';
      if (!moduleStats[mod]) {
        moduleStats[mod] = { total: 0, completed: 0 };
      }
      moduleStats[mod].total += item.count;
      if (item._id.status === 'facturada') {
        moduleStats[mod].completed += item.count;
      }
    });

    const truckingEfficiency = moduleStats.trucking
      ? moduleStats.trucking.completed / moduleStats.trucking.total
      : 0;

    const ptyssEfficiency = moduleStats.ptyss
      ? moduleStats.ptyss.completed / moduleStats.ptyss.total
      : 0;

    const shipchandlerEfficiency = moduleStats.shipchandler
      ? moduleStats.shipchandler.completed / moduleStats.shipchandler.total
      : 0;

    // Agency efficiency
    const totalAgency = await agencyServices.countDocuments(matchStage);
    const completedAgency = await agencyServices.countDocuments({ ...matchStage, status: 'completed' });
    const agencyEfficiency = totalAgency > 0 ? completedAgency / totalAgency : 0;

    return res.json({
      success: true,
      data: {
        overallCompletionRate,
        truckingEfficiency,
        ptyssEfficiency,
        shipchandlerEfficiency,
        agencyEfficiency,
        averageProcessingTime: 24,
        moduleStats,
        totals: {
          invoices: totalInvoices,
          completed: completedInvoices,
          agencyServices: totalAgency,
          agencyCompleted: completedAgency
        }
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
    const dateFilter = parseDateFilter(req);
    const matchStage: any = { module: 'trucking' };
    if (dateFilter.createdAt) matchStage.createdAt = dateFilter.createdAt;

    const stats = await invoices.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const recordsMatch: any = { module: 'Trucking' };
    if (dateFilter.createdAt) recordsMatch.createdAt = dateFilter.createdAt;

    const totalRecords = await records.countDocuments(recordsMatch);
    const totalRevenue = stats.reduce((sum: number, s: any) => sum + (s.revenue || 0), 0);
    const totalInvoices = stats.reduce((sum: number, s: any) => sum + s.count, 0);

    const byStatus: any = {};
    stats.forEach((s: any) => {
      byStatus[s._id || 'unknown'] = s.count;
    });

    // Top clientes
    const topClients = await invoices.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$clientName',
          totalRevenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    return res.json({
      success: true,
      data: {
        totalRecords,
        totalRevenue,
        totalInvoices,
        byStatus,
        topClients,
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
    const dateFilter = parseDateFilter(req);
    const matchStage: any = { module: 'ptyss' };
    if (dateFilter.createdAt) matchStage.createdAt = dateFilter.createdAt;

    const stats = await invoices.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const recordsMatch: any = { module: 'PTYSS' };
    if (dateFilter.createdAt) recordsMatch.createdAt = dateFilter.createdAt;

    const totalRecords = await records.countDocuments(recordsMatch);
    const totalRevenue = stats.reduce((sum: number, s: any) => sum + (s.revenue || 0), 0);
    const totalInvoices = stats.reduce((sum: number, s: any) => sum + s.count, 0);

    const byStatus: any = {};
    stats.forEach((s: any) => {
      byStatus[s._id || 'unknown'] = s.count;
    });

    // Top clientes
    const topClients = await invoices.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$clientName',
          totalRevenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    return res.json({
      success: true,
      data: {
        totalRecords,
        totalRevenue,
        totalInvoices,
        byStatus,
        topClients,
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
    const dateFilter = parseDateFilter(req);
    const matchStage: any = { module: 'shipchandler' };
    if (dateFilter.createdAt) matchStage.createdAt = dateFilter.createdAt;

    const stats = await invoices.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const recordsMatch: any = { module: 'ShipChandler' };
    if (dateFilter.createdAt) recordsMatch.createdAt = dateFilter.createdAt;

    const totalRecords = await records.countDocuments(recordsMatch);
    const totalRevenue = stats.reduce((sum: number, s: any) => sum + (s.revenue || 0), 0);
    const totalInvoices = stats.reduce((sum: number, s: any) => sum + s.count, 0);

    const byStatus: any = {};
    stats.forEach((s: any) => {
      byStatus[s._id || 'unknown'] = s.count;
    });

    // Top clientes
    const topClients = await invoices.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$clientName',
          totalRevenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    return res.json({
      success: true,
      data: {
        totalRecords,
        totalRevenue,
        totalInvoices,
        byStatus,
        topClients,
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
    const dateFilter = parseDateFilter(req);
    const matchStage = Object.keys(dateFilter).length > 0 ? dateFilter : {};

    // Stats de servicios
    const serviceStats = await agencyServices.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Stats de facturas
    const invoiceStats = await agencyInvoices.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalServices = await agencyServices.countDocuments(matchStage);
    const totalRevenue = invoiceStats.reduce((sum: number, s: any) => sum + (s.revenue || 0), 0);
    const totalInvoices = invoiceStats.reduce((sum: number, s: any) => sum + s.count, 0);

    const byStatus: any = {};
    serviceStats.forEach((s: any) => {
      byStatus[s._id || 'unknown'] = s.count;
    });

    // Top clientes de agency
    const topClients = await agencyInvoices.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: '$clientName',
          totalRevenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    return res.json({
      success: true,
      data: {
        totalRecords: totalServices,
        totalRevenue,
        totalInvoices,
        byStatus,
        topClients,
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
    const dateFilter = parseDateFilter(req);

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

    // Top clientes por revenue
    const topByRevenue = await invoices.aggregate([
      {
        $group: {
          _id: '$clientName',
          totalRevenue: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    // Clientes por mes (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const clientsByMonth = await clients.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
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
        }, {}),
        topByRevenue,
        clientsByMonth: clientsByMonth.map((c: any) => ({
          year: c._id.year,
          month: c._id.month,
          count: c.count
        }))
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
    const dateFilter = parseDateFilter(req);
    const matchStage = Object.keys(dateFilter).length > 0 ? dateFilter : {};

    // Stats de invoices generales
    const generalStats = await invoices.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
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
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
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
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: '$module',
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Facturas por día (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const invoicesByDay = await invoices.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
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
        },
        invoicesByDay: invoicesByDay.map((d: any) => ({
          date: d._id,
          count: d.count,
          amount: d.amount
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getInvoiceAnalytics:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/analytics/advanced - Métricas avanzadas
export const getAdvancedAnalytics = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setMilliseconds(-1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);

    // Revenue este mes vs mes anterior
    const thisMonthRevenue = await invoices.aggregate([
      { $match: { createdAt: { $gte: startOfThisMonth } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    const lastMonthRevenue = await invoices.aggregate([
      { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    // Revenue esta semana vs semana anterior
    const thisWeekRevenue = await invoices.aggregate([
      { $match: { createdAt: { $gte: startOfThisWeek } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    const lastWeekRevenue = await invoices.aggregate([
      { $match: { createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    // Revenue este año vs año anterior
    const thisYearRevenue = await invoices.aggregate([
      { $match: { createdAt: { $gte: startOfYear } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    const lastYearRevenue = await invoices.aggregate([
      { $match: { createdAt: { $gte: startOfLastYear, $lte: endOfLastYear } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    // Ticket promedio
    const allInvoicesStats = await invoices.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 }, avg: { $avg: '$totalAmount' }, max: { $max: '$totalAmount' }, min: { $min: '$totalAmount' } } }
    ]);

    // Actividad por hora (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activityByHour = await invoices.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } }
    ]);

    // Actividad por día de semana
    const activityByDayOfWeek = await invoices.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } }
    ]);

    // Top 5 clientes este mes
    const topClientsThisMonth = await invoices.aggregate([
      { $match: { createdAt: { $gte: startOfThisMonth } } },
      { $group: { _id: '$clientName', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    // Últimas 10 transacciones
    const recentTransactions = await invoices.find({})
      .select('invoiceNumber clientName module totalAmount status createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Usuarios activos (que han creado facturas)
    const activeUsers = await invoices.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$createdBy', count: { $sum: 1 }, totalRevenue: { $sum: '$totalAmount' } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    // Registros por módulo y estado
    const recordsByModuleStatus = await records.aggregate([
      { $group: { _id: { module: '$module', status: '$status' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Crecimiento de clientes (últimos 12 meses)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const clientGrowth = await clients.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Calcular crecimiento porcentual
    const thisMonthTotal = thisMonthRevenue[0]?.total || 0;
    const lastMonthTotal = lastMonthRevenue[0]?.total || 0;
    const monthOverMonthGrowth = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    const thisWeekTotal = thisWeekRevenue[0]?.total || 0;
    const lastWeekTotal = lastWeekRevenue[0]?.total || 0;
    const weekOverWeekGrowth = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0;

    const thisYearTotal = thisYearRevenue[0]?.total || 0;
    const lastYearTotal = lastYearRevenue[0]?.total || 0;
    const yearOverYearGrowth = lastYearTotal > 0 ? ((thisYearTotal - lastYearTotal) / lastYearTotal) * 100 : 0;

    // Días de la semana
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return res.json({
      success: true,
      data: {
        comparisons: {
          thisMonth: { revenue: thisMonthTotal, count: thisMonthRevenue[0]?.count || 0 },
          lastMonth: { revenue: lastMonthTotal, count: lastMonthRevenue[0]?.count || 0 },
          monthOverMonthGrowth,
          thisWeek: { revenue: thisWeekTotal, count: thisWeekRevenue[0]?.count || 0 },
          lastWeek: { revenue: lastWeekTotal, count: lastWeekRevenue[0]?.count || 0 },
          weekOverWeekGrowth,
          thisYear: { revenue: thisYearTotal, count: thisYearRevenue[0]?.count || 0 },
          lastYear: { revenue: lastYearTotal, count: lastYearRevenue[0]?.count || 0 },
          yearOverYearGrowth,
        },
        ticketStats: {
          average: allInvoicesStats[0]?.avg || 0,
          max: allInvoicesStats[0]?.max || 0,
          min: allInvoicesStats[0]?.min || 0,
          total: allInvoicesStats[0]?.total || 0,
          count: allInvoicesStats[0]?.count || 0,
        },
        activityByHour: activityByHour.map((h: any) => ({
          hour: h._id,
          count: h.count,
          amount: h.amount,
        })),
        activityByDayOfWeek: activityByDayOfWeek.map((d: any) => ({
          day: d._id,
          dayName: dayNames[d._id - 1] || d._id,
          count: d.count,
          amount: d.amount,
        })),
        topClientsThisMonth: topClientsThisMonth.map((c: any) => ({
          name: c._id || 'N/A',
          revenue: c.total,
          count: c.count,
        })),
        recentTransactions: recentTransactions.map((t: any) => ({
          id: t._id,
          invoiceNumber: t.invoiceNumber,
          client: t.clientName,
          module: t.module,
          amount: t.totalAmount,
          status: t.status,
          date: t.createdAt,
        })),
        activeUsers: activeUsers.map((u: any) => ({
          userId: u._id,
          invoiceCount: u.count,
          totalRevenue: u.totalRevenue,
        })),
        recordsByModuleStatus: recordsByModuleStatus.map((r: any) => ({
          module: r._id.module,
          status: r._id.status,
          count: r.count,
        })),
        clientGrowth: clientGrowth.map((c: any) => ({
          year: c._id.year,
          month: c._id.month,
          count: c.count,
        })),
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getAdvancedAnalytics:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/analytics/forecasting - Predicciones basadas en tendencias históricas
export const getForecastingAnalytics = async (req: Request, res: Response) => {
  try {
    // Obtener datos históricos de los últimos 12 meses
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyRevenue = await invoices.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Calcular tendencia lineal simple (regresión lineal)
    const dataPoints = monthlyRevenue.map((m: any, index: number) => ({
      x: index,
      y: m.revenue,
      month: m._id.month,
      year: m._id.year,
      count: m.count
    }));

    // Regresión lineal: y = mx + b
    const n = dataPoints.length;
    if (n < 3) {
      return res.json({
        success: true,
        data: {
          historical: [],
          forecast: [],
          trend: { slope: 0, intercept: 0 },
          confidence: 0,
          averageGrowth: 0,
          nextMonthPrediction: 0,
          nextQuarterPrediction: 0,
          message: 'Datos insuficientes para predicción'
        }
      });
    }

    const sumX = dataPoints.reduce((sum: number, p: any) => sum + p.x, 0);
    const sumY = dataPoints.reduce((sum: number, p: any) => sum + p.y, 0);
    const sumXY = dataPoints.reduce((sum: number, p: any) => sum + p.x * p.y, 0);
    const sumX2 = dataPoints.reduce((sum: number, p: any) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calcular R² (coeficiente de determinación)
    const yMean = sumY / n;
    const ssTotal = dataPoints.reduce((sum: number, p: any) => sum + Math.pow(p.y - yMean, 2), 0);
    const ssResidual = dataPoints.reduce((sum: number, p: any) => {
      const predicted = slope * p.x + intercept;
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);
    const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;

    // Calcular crecimiento promedio mensual
    const growthRates: number[] = [];
    for (let i = 1; i < dataPoints.length; i++) {
      if (dataPoints[i - 1].y > 0) {
        growthRates.push((dataPoints[i].y - dataPoints[i - 1].y) / dataPoints[i - 1].y);
      }
    }
    const averageGrowth = growthRates.length > 0 ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length : 0;

    // Generar predicciones para los próximos 3 meses
    const forecasts = [];
    const now = new Date();
    for (let i = 1; i <= 3; i++) {
      const futureMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const predictedValue = slope * (n + i - 1) + intercept;
      forecasts.push({
        year: futureMonth.getFullYear(),
        month: futureMonth.getMonth() + 1,
        predictedRevenue: Math.max(0, predictedValue),
        predictedCount: Math.round(Math.max(0, predictedValue / (sumY / n) * (dataPoints.reduce((sum: number, p: any) => sum + p.count, 0) / n)))
      });
    }

    // Predicciones específicas
    const nextMonthPrediction = forecasts[0]?.predictedRevenue || 0;
    const nextQuarterPrediction = forecasts.reduce((sum, f) => sum + f.predictedRevenue, 0);

    // Datos históricos formateados
    const historical = dataPoints.map((p: any) => ({
      year: p.year,
      month: p.month,
      revenue: p.y,
      count: p.count,
      trendLine: slope * p.x + intercept
    }));

    return res.json({
      success: true,
      data: {
        historical,
        forecast: forecasts,
        trend: {
          slope,
          intercept,
          direction: slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'stable',
          monthlyChange: slope
        },
        confidence: Math.max(0, Math.min(1, rSquared)),
        averageGrowth: averageGrowth * 100,
        nextMonthPrediction,
        nextQuarterPrediction,
        seasonality: {
          bestMonth: dataPoints.reduce((best: any, p: any) => p.y > (best?.y || 0) ? p : best, null),
          worstMonth: dataPoints.reduce((worst: any, p: any) => (worst === null || p.y < worst.y) ? p : worst, null)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getForecastingAnalytics:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/analytics/module-comparison - Comparativas detalladas entre módulos
export const getModuleComparison = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Métricas por módulo este mes
    const moduleStatsThisMonth = await invoices.aggregate([
      { $match: { createdAt: { $gte: startOfThisMonth } } },
      {
        $group: {
          _id: '$module',
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
          avgTicket: { $avg: '$totalAmount' },
          maxTicket: { $max: '$totalAmount' },
          minTicket: { $min: '$totalAmount' },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'facturada'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'prefactura'] }, 1, 0] } }
        }
      }
    ]);

    // Métricas por módulo mes anterior
    const moduleStatsLastMonth = await invoices.aggregate([
      { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      {
        $group: {
          _id: '$module',
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Clientes únicos por módulo
    const uniqueClientsByModule = await invoices.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$module',
          clients: { $addToSet: '$clientName' }
        }
      },
      {
        $project: {
          _id: 1,
          uniqueClients: { $size: '$clients' }
        }
      }
    ]);

    // Tendencia diaria por módulo (últimos 30 días)
    const dailyTrendByModule = await invoices.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            module: '$module'
          },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Top clientes por módulo
    const topClientsByModule = await invoices.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { module: '$module', client: '$clientName' },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      {
        $group: {
          _id: '$_id.module',
          topClients: { $push: { name: '$_id.client', revenue: '$revenue', count: '$count' } }
        }
      },
      {
        $project: {
          _id: 1,
          topClients: { $slice: ['$topClients', 5] }
        }
      }
    ]);

    // Combinar datos
    const modules = ['trucking', 'ptyss', 'shipchandler'];
    const moduleComparison = modules.map(mod => {
      const thisMonth = moduleStatsThisMonth.find((m: any) => m._id === mod) || { revenue: 0, count: 0, avgTicket: 0, maxTicket: 0, minTicket: 0, completed: 0, pending: 0 };
      const lastMonth = moduleStatsLastMonth.find((m: any) => m._id === mod) || { revenue: 0, count: 0 };
      const clients = uniqueClientsByModule.find((m: any) => m._id === mod) || { uniqueClients: 0 };
      const topClients = topClientsByModule.find((m: any) => m._id === mod)?.topClients || [];

      const growth = lastMonth.revenue > 0 ? ((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100 : 0;
      const completionRate = thisMonth.count > 0 ? (thisMonth.completed / thisMonth.count) * 100 : 0;

      return {
        module: mod,
        thisMonth: {
          revenue: thisMonth.revenue,
          count: thisMonth.count,
          avgTicket: thisMonth.avgTicket,
          maxTicket: thisMonth.maxTicket,
          minTicket: thisMonth.minTicket,
          completed: thisMonth.completed,
          pending: thisMonth.pending,
          completionRate
        },
        lastMonth: {
          revenue: lastMonth.revenue,
          count: lastMonth.count
        },
        growth,
        uniqueClients: clients.uniqueClients,
        topClients
      };
    });

    // Agency stats separado
    const agencyThisMonth = await agencyInvoices.aggregate([
      { $match: { createdAt: { $gte: startOfThisMonth } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
          avgTicket: { $avg: '$totalAmount' },
          maxTicket: { $max: '$totalAmount' },
          minTicket: { $min: '$totalAmount' }
        }
      }
    ]);

    const agencyLastMonth = await agencyInvoices.aggregate([
      { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    const agencyUniqueClients = await agencyInvoices.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, clients: { $addToSet: '$clientName' } } },
      { $project: { uniqueClients: { $size: '$clients' } } }
    ]);

    const agencyData = agencyThisMonth[0] || { revenue: 0, count: 0, avgTicket: 0, maxTicket: 0, minTicket: 0 };
    const agencyLast = agencyLastMonth[0] || { revenue: 0, count: 0 };
    const agencyGrowth = agencyLast.revenue > 0 ? ((agencyData.revenue - agencyLast.revenue) / agencyLast.revenue) * 100 : 0;

    moduleComparison.push({
      module: 'agency',
      thisMonth: {
        revenue: agencyData.revenue,
        count: agencyData.count,
        avgTicket: agencyData.avgTicket,
        maxTicket: agencyData.maxTicket,
        minTicket: agencyData.minTicket,
        completed: 0,
        pending: 0,
        completionRate: 100
      },
      lastMonth: {
        revenue: agencyLast.revenue,
        count: agencyLast.count
      },
      growth: agencyGrowth,
      uniqueClients: agencyUniqueClients[0]?.uniqueClients || 0,
      topClients: []
    });

    // Ranking de módulos
    const rankings = {
      byRevenue: [...moduleComparison].sort((a, b) => b.thisMonth.revenue - a.thisMonth.revenue),
      byVolume: [...moduleComparison].sort((a, b) => b.thisMonth.count - a.thisMonth.count),
      byGrowth: [...moduleComparison].sort((a, b) => b.growth - a.growth),
      byAvgTicket: [...moduleComparison].sort((a, b) => (b.thisMonth.avgTicket || 0) - (a.thisMonth.avgTicket || 0))
    };

    // Formatear tendencia diaria
    const dailyTrend: { [key: string]: any[] } = {};
    dailyTrendByModule.forEach((item: any) => {
      const mod = item._id.module;
      if (!dailyTrend[mod]) dailyTrend[mod] = [];
      dailyTrend[mod].push({
        date: item._id.date,
        revenue: item.revenue,
        count: item.count
      });
    });

    return res.json({
      success: true,
      data: {
        modules: moduleComparison,
        rankings,
        dailyTrend,
        totals: {
          revenue: moduleComparison.reduce((sum, m) => sum + m.thisMonth.revenue, 0),
          count: moduleComparison.reduce((sum, m) => sum + m.thisMonth.count, 0),
          avgGrowth: moduleComparison.reduce((sum, m) => sum + m.growth, 0) / moduleComparison.length
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getModuleComparison:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/analytics/alerts - Alertas y detección de anomalías
export const getAlertsAnalytics = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const alerts: any[] = [];

    // 1. Revenue de hoy vs promedio de últimos 7 días
    const todayRevenue = await invoices.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    const last7DaysRevenue = await invoices.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo, $lt: today } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    const todayTotal = todayRevenue[0]?.total || 0;
    const avgDaily7Days = (last7DaysRevenue[0]?.total || 0) / 7;
    const todayCount = todayRevenue[0]?.count || 0;
    const avgDailyCount7Days = (last7DaysRevenue[0]?.count || 0) / 7;

    // Alerta si hoy es 50% más bajo que el promedio
    if (avgDaily7Days > 0 && todayTotal < avgDaily7Days * 0.5) {
      alerts.push({
        type: 'warning',
        category: 'revenue',
        title: 'Revenue bajo hoy',
        message: `Revenue de hoy ($${todayTotal.toFixed(2)}) está ${((1 - todayTotal / avgDaily7Days) * 100).toFixed(0)}% por debajo del promedio diario`,
        value: todayTotal,
        threshold: avgDaily7Days,
        severity: 'medium'
      });
    }

    // Alerta si hoy es 100% más alto que el promedio (positiva)
    if (avgDaily7Days > 0 && todayTotal > avgDaily7Days * 2) {
      alerts.push({
        type: 'success',
        category: 'revenue',
        title: 'Revenue excepcional hoy',
        message: `Revenue de hoy ($${todayTotal.toFixed(2)}) es ${((todayTotal / avgDaily7Days - 1) * 100).toFixed(0)}% superior al promedio`,
        value: todayTotal,
        threshold: avgDaily7Days,
        severity: 'low'
      });
    }

    // 2. Verificar facturas sin procesar (más de 7 días como prefactura)
    const oldPrefacturas = await invoices.countDocuments({
      status: 'prefactura',
      createdAt: { $lt: sevenDaysAgo }
    });

    if (oldPrefacturas > 0) {
      alerts.push({
        type: 'warning',
        category: 'operations',
        title: 'Prefacturas pendientes antiguas',
        message: `Hay ${oldPrefacturas} prefacturas con más de 7 días sin procesar`,
        value: oldPrefacturas,
        threshold: 0,
        severity: 'high'
      });
    }

    // 3. Comparar este mes vs mes anterior (si estamos en negativo)
    const thisMonthRevenue = await invoices.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const lastMonthRevenue = await invoices.aggregate([
      { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const daysIntoMonth = now.getDate();
    const daysInLastMonth = endOfLastMonth.getDate();
    const projectedThisMonth = (thisMonthRevenue[0]?.total || 0) / daysIntoMonth * daysInLastMonth;
    const lastMonthTotal = lastMonthRevenue[0]?.total || 0;

    if (lastMonthTotal > 0 && projectedThisMonth < lastMonthTotal * 0.8) {
      alerts.push({
        type: 'warning',
        category: 'trend',
        title: 'Proyección mensual baja',
        message: `Si continúa la tendencia, este mes cerrará ${((1 - projectedThisMonth / lastMonthTotal) * 100).toFixed(0)}% por debajo del mes anterior`,
        value: projectedThisMonth,
        threshold: lastMonthTotal,
        severity: 'medium'
      });
    }

    // 4. Módulos con actividad inusualmente baja
    const moduleActivity = await invoices.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$module', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
    ]);

    const moduleHistorical = await invoices.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo, $lt: sevenDaysAgo } } },
      { $group: { _id: '$module', avgDaily: { $sum: { $divide: ['$totalAmount', 23] } } } }
    ]);

    moduleActivity.forEach((mod: any) => {
      const historical = moduleHistorical.find((h: any) => h._id === mod._id);
      if (historical && historical.avgDaily > 0) {
        const expectedWeekly = historical.avgDaily * 7;
        if (mod.revenue < expectedWeekly * 0.3) {
          alerts.push({
            type: 'warning',
            category: 'module',
            title: `Baja actividad en ${mod._id?.toUpperCase() || 'módulo'}`,
            message: `Revenue de la semana está ${((1 - mod.revenue / expectedWeekly) * 100).toFixed(0)}% por debajo de lo esperado`,
            value: mod.revenue,
            threshold: expectedWeekly,
            severity: 'medium',
            module: mod._id
          });
        }
      }
    });

    // 5. Clientes que no han facturado en 30 días (top clientes)
    const topClientsLastMonth = await invoices.aggregate([
      { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 2, 1), $lt: startOfMonth } } },
      { $group: { _id: '$clientName', total: { $sum: '$totalAmount' } } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);

    const activeClientsThisMonth = await invoices.distinct('clientName', { createdAt: { $gte: startOfMonth } });

    const inactiveTopClients = topClientsLastMonth.filter((c: any) => !activeClientsThisMonth.includes(c._id));
    if (inactiveTopClients.length > 0) {
      alerts.push({
        type: 'info',
        category: 'clients',
        title: 'Top clientes inactivos',
        message: `${inactiveTopClients.length} de los top 10 clientes del mes anterior no han facturado este mes`,
        value: inactiveTopClients.length,
        clients: inactiveTopClients.slice(0, 5).map((c: any) => c._id),
        severity: 'low'
      });
    }

    // 6. Ticket promedio inusual
    const currentAvgTicket = await invoices.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: null, avg: { $avg: '$totalAmount' } } }
    ]);

    const historicalAvgTicket = await invoices.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo, $lt: sevenDaysAgo } } },
      { $group: { _id: null, avg: { $avg: '$totalAmount' } } }
    ]);

    const currentAvg = currentAvgTicket[0]?.avg || 0;
    const historicalAvg = historicalAvgTicket[0]?.avg || 0;

    if (historicalAvg > 0 && Math.abs(currentAvg - historicalAvg) / historicalAvg > 0.3) {
      const isUp = currentAvg > historicalAvg;
      alerts.push({
        type: isUp ? 'success' : 'warning',
        category: 'ticket',
        title: `Ticket promedio ${isUp ? 'alto' : 'bajo'}`,
        message: `El ticket promedio esta semana ($${currentAvg.toFixed(2)}) es ${Math.abs((currentAvg / historicalAvg - 1) * 100).toFixed(0)}% ${isUp ? 'superior' : 'inferior'} al histórico`,
        value: currentAvg,
        threshold: historicalAvg,
        severity: 'low'
      });
    }

    // Ordenar alertas por severidad
    const severityOrder: { [key: string]: number } = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Resumen
    const summary = {
      total: alerts.length,
      byType: {
        success: alerts.filter(a => a.type === 'success').length,
        warning: alerts.filter(a => a.type === 'warning').length,
        info: alerts.filter(a => a.type === 'info').length
      },
      bySeverity: {
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      },
      healthScore: Math.max(0, 100 - (alerts.filter(a => a.severity === 'high').length * 30) - (alerts.filter(a => a.severity === 'medium').length * 15) - (alerts.filter(a => a.severity === 'low').length * 5))
    };

    return res.json({
      success: true,
      data: {
        alerts,
        summary,
        metrics: {
          todayRevenue: todayTotal,
          todayTransactions: todayCount,
          avgDailyRevenue: avgDaily7Days,
          avgDailyTransactions: avgDailyCount7Days,
          projectedMonthly: projectedThisMonth,
          lastMonthRevenue: lastMonthTotal
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getAlertsAnalytics:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/analytics/efficiency-rankings - Rankings de eficiencia
export const getEfficiencyRankings = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // 1. Ranking de clientes más rentables
    const topClientsByRevenue = await invoices.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$clientName',
          totalRevenue: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 },
          avgTicket: { $avg: '$totalAmount' },
          modules: { $addToSet: '$module' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 20 }
    ]);

    // Histórico para calcular tendencia de cada cliente
    const clientHistorical = await invoices.aggregate([
      { $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
      { $group: { _id: '$clientName', revenue: { $sum: '$totalAmount' } } }
    ]);

    const clientRankings = topClientsByRevenue.map((client: any, index: number) => {
      const historical = clientHistorical.find((h: any) => h._id === client._id);
      const previousRevenue = historical?.revenue || 0;
      const growth = previousRevenue > 0 ? ((client.totalRevenue - previousRevenue) / previousRevenue) * 100 : 100;
      return {
        rank: index + 1,
        name: client._id || 'Sin nombre',
        revenue: client.totalRevenue,
        invoices: client.invoiceCount,
        avgTicket: client.avgTicket,
        modules: client.modules,
        growth,
        score: client.totalRevenue * (1 + growth / 100) * (client.invoiceCount / 10)
      };
    }).sort((a: any, b: any) => b.score - a.score);

    // 2. Ranking de módulos por eficiencia
    const moduleEfficiency = await invoices.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$module',
          totalRevenue: { $sum: '$totalAmount' },
          totalInvoices: { $sum: 1 },
          avgTicket: { $avg: '$totalAmount' },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'facturada'] }, 1, 0] } },
          uniqueClients: { $addToSet: '$clientName' }
        }
      }
    ]);

    const moduleRankings = moduleEfficiency.map((mod: any) => {
      const completionRate = mod.totalInvoices > 0 ? (mod.completed / mod.totalInvoices) * 100 : 0;
      const clientCount = mod.uniqueClients?.length || 0;
      const revenuePerClient = clientCount > 0 ? mod.totalRevenue / clientCount : 0;
      const efficiencyScore = (completionRate * 0.3) + (mod.avgTicket / 1000 * 0.3) + (clientCount * 0.2) + (mod.totalInvoices * 0.2);
      return {
        module: mod._id || 'unknown',
        revenue: mod.totalRevenue,
        invoices: mod.totalInvoices,
        avgTicket: mod.avgTicket,
        completionRate,
        uniqueClients: clientCount,
        revenuePerClient,
        efficiencyScore
      };
    }).sort((a: any, b: any) => b.efficiencyScore - a.efficiencyScore);

    // 3. Ranking de días más productivos
    const dailyProductivity = await invoices.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
          avgTicket: { $avg: '$totalAmount' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayRankings = dailyProductivity.map((day: any, index: number) => ({
      rank: index + 1,
      day: dayNames[day._id - 1],
      dayNumber: day._id,
      revenue: day.revenue,
      transactions: day.count,
      avgTicket: day.avgTicket
    }));

    // 4. Ranking de horas más productivas
    const hourlyProductivity = await invoices.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
          avgTicket: { $avg: '$totalAmount' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    const hourRankings = hourlyProductivity.map((hour: any, index: number) => ({
      rank: index + 1,
      hour: hour._id,
      label: `${hour._id}:00 - ${hour._id + 1}:00`,
      revenue: hour.revenue,
      transactions: hour.count,
      avgTicket: hour.avgTicket
    }));

    // 5. Ranking de crecimiento de clientes
    const clientGrowth = await invoices.aggregate([
      { $match: { createdAt: { $gte: sixtyDaysAgo } } },
      {
        $group: {
          _id: {
            client: '$clientName',
            period: { $cond: [{ $gte: ['$createdAt', thirtyDaysAgo] }, 'current', 'previous'] }
          },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const growthMap: { [key: string]: { current: number; previous: number } } = {};
    clientGrowth.forEach((item: any) => {
      const client = item._id.client;
      if (!growthMap[client]) growthMap[client] = { current: 0, previous: 0 };
      growthMap[client][item._id.period] = item.revenue;
    });

    const growthRankings = Object.entries(growthMap)
      .map(([name, data]) => {
        const growth = data.previous > 0 ? ((data.current - data.previous) / data.previous) * 100 : (data.current > 0 ? 100 : 0);
        return { name, current: data.current, previous: data.previous, growth };
      })
      .filter(c => c.current > 100 || c.previous > 100) // Solo clientes con actividad significativa
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 15);

    // 6. Clientes en riesgo (decrecimiento)
    const atRiskClients = Object.entries(growthMap)
      .map(([name, data]) => {
        const growth = data.previous > 0 ? ((data.current - data.previous) / data.previous) * 100 : 0;
        return { name, current: data.current, previous: data.previous, growth };
      })
      .filter(c => c.previous > 500 && c.growth < -30)
      .sort((a, b) => a.growth - b.growth)
      .slice(0, 10);

    return res.json({
      success: true,
      data: {
        clients: clientRankings,
        modules: moduleRankings,
        days: dayRankings,
        hours: hourRankings,
        growth: growthRankings,
        atRisk: atRiskClients,
        summary: {
          topClient: clientRankings[0]?.name || 'N/A',
          topModule: moduleRankings[0]?.module || 'N/A',
          bestDay: dayRankings[0]?.day || 'N/A',
          bestHour: hourRankings[0]?.label || 'N/A',
          clientsAtRisk: atRiskClients.length
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in getEfficiencyRankings:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/analytics/export - Exportar datos a Excel
export const exportAnalyticsToExcel = async (req: Request, res: Response) => {
  try {
    const { type = 'all' } = req.query;
    const dateFilter = parseDateFilter(req);
    const matchStage = Object.keys(dateFilter).length > 0 ? dateFilter : {};

    const workbook = XLSX.utils.book_new();

    // Hoja de Resumen
    const summaryData: any[] = [];

    // Obtener métricas
    const totalInvoicesCount = await invoices.countDocuments(matchStage);
    const totalRevenue = await invoices.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalClients = await clients.countDocuments({ isActive: true });

    summaryData.push(['Métrica', 'Valor']);
    summaryData.push(['Total Facturas', totalInvoicesCount]);
    summaryData.push(['Revenue Total', totalRevenue[0]?.total || 0]);
    summaryData.push(['Clientes Activos', totalClients]);

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    // Hoja de Facturas por Módulo
    const moduleData = await invoices.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: '$module',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const moduleSheetData = [['Módulo', 'Cantidad', 'Revenue']];
    moduleData.forEach((m: any) => {
      moduleSheetData.push([m._id || 'Unknown', m.count, m.revenue]);
    });

    const moduleSheet = XLSX.utils.aoa_to_sheet(moduleSheetData);
    XLSX.utils.book_append_sheet(workbook, moduleSheet, 'Por Módulo');

    // Hoja de Top Clientes
    const topClients = await invoices.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: '$clientName',
          totalRevenue: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 50 }
    ]);

    const clientSheetData = [['Cliente', 'Revenue Total', 'Cantidad Facturas']];
    topClients.forEach((c: any) => {
      clientSheetData.push([c._id || 'Unknown', c.totalRevenue, c.invoiceCount]);
    });

    const clientSheet = XLSX.utils.aoa_to_sheet(clientSheetData);
    XLSX.utils.book_append_sheet(workbook, clientSheet, 'Top Clientes');

    // Hoja de Facturas Detalle
    const allInvoices = await invoices.find(matchStage)
      .select('invoiceNumber clientName module status totalAmount createdAt')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const invoiceSheetData = [['Número', 'Cliente', 'Módulo', 'Estado', 'Total', 'Fecha']];
    allInvoices.forEach((inv: any) => {
      invoiceSheetData.push([
        inv.invoiceNumber || '',
        inv.clientName || '',
        inv.module || '',
        inv.status || '',
        inv.totalAmount || 0,
        inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : ''
      ]);
    });

    const invoiceSheet = XLSX.utils.aoa_to_sheet(invoiceSheetData);
    XLSX.utils.book_append_sheet(workbook, invoiceSheet, 'Facturas');

    // Generar buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Enviar respuesta
    const filename = `analytics_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error: any) {
    console.error('Error in exportAnalyticsToExcel:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
