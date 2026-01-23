import { Router, Request, Response } from 'express';
import { RequestLog } from '../database/schemas/requestLogSchema';

const router = Router();

// POST /api/logs/frontend - Recibir errores del frontend
router.post('/frontend', async (req: Request, res: Response) => {
  try {
    const {
      method,
      url,
      statusCode,
      responseTime,
      error,
      module,
      action,
      componentName,
      pageUrl,
      browserInfo,
      requestBody,
      responseBody,
      userId,
      userEmail,
      userName
    } = req.body;

    // Validar campos mínimos
    if (!url || !error?.message) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: url, error.message'
      });
    }

    const logData = {
      timestamp: new Date(),
      source: 'frontend' as const,
      method: method || 'UNKNOWN',
      url,
      path: new URL(url, 'http://localhost').pathname,
      statusCode: statusCode || 0,
      responseTime: responseTime || 0,
      userId,
      userEmail,
      userName,
      ip: req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      requestBody,
      responseBody,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name || 'FrontendError'
      },
      module,
      action,
      componentName,
      pageUrl,
      browserInfo
    };

    await RequestLog.create(logData);

    console.log(`📱 [FRONTEND ERROR] ${method || 'ERR'} ${url} - ${error.message} (${userEmail || 'anonymous'})`);

    res.json({ success: true, message: 'Error logged successfully' });
  } catch (err: any) {
    console.error('Error guardando frontend log:', err);
    res.status(500).json({
      success: false,
      message: 'Error al guardar log',
      error: err.message
    });
  }
});

// GET /api/logs - Obtener logs (para debugging)
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      source,
      module,
      statusCode,
      userId,
      startDate,
      endDate,
      limit = 100,
      page = 1,
      onlyErrors
    } = req.query;

    const query: any = {};

    if (source) query.source = source;
    if (module) query.module = module;
    if (statusCode) query.statusCode = Number(statusCode);
    if (userId) query.userId = userId;
    if (onlyErrors === 'true') query.statusCode = { $gte: 400 };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      RequestLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      RequestLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit)
      }
    });
  } catch (err: any) {
    console.error('Error obteniendo logs:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener logs',
      error: err.message
    });
  }
});

// GET /api/logs/stats - Estadísticas de logs
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalLast24h,
      errorsLast24h,
      byModule,
      byStatusCode,
      topErrors
    ] = await Promise.all([
      RequestLog.countDocuments({ timestamp: { $gte: last24h } }),
      RequestLog.countDocuments({ timestamp: { $gte: last24h }, statusCode: { $gte: 400 } }),
      RequestLog.aggregate([
        { $match: { timestamp: { $gte: last24h } } },
        { $group: { _id: '$module', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      RequestLog.aggregate([
        { $match: { timestamp: { $gte: last24h } } },
        { $group: { _id: '$statusCode', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      RequestLog.aggregate([
        { $match: { timestamp: { $gte: last24h }, statusCode: { $gte: 400 } } },
        { $group: { _id: '$error.message', count: { $sum: 1 }, lastOccurrence: { $max: '$timestamp' } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        last24h: {
          total: totalLast24h,
          errors: errorsLast24h,
          errorRate: totalLast24h > 0 ? ((errorsLast24h / totalLast24h) * 100).toFixed(2) + '%' : '0%'
        },
        byModule,
        byStatusCode,
        topErrors
      }
    });
  } catch (err: any) {
    console.error('Error obteniendo estadísticas:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: err.message
    });
  }
});

export default router;
