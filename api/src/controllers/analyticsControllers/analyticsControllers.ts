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
