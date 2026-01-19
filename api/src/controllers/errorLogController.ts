import { Request, Response } from 'express';
import { ErrorLog, IErrorLog } from '../database/schemas/errorLogSchema';

// Función helper para loggear errores desde cualquier parte del código
export const logError = async (params: {
  level?: 'error' | 'warning' | 'info';
  module: string;
  action: string;
  message: string;
  stack?: string;
  userId?: string;
  userEmail?: string;
  requestData?: any;
  metadata?: any;
}): Promise<IErrorLog | null> => {
  try {
    const errorLog = await ErrorLog.create({
      level: params.level || 'error',
      module: params.module,
      action: params.action,
      message: params.message,
      stack: params.stack,
      userId: params.userId,
      userEmail: params.userEmail,
      requestData: params.requestData,
      metadata: params.metadata,
      resolved: false
    });

    console.log(`📝 Error logged: [${params.level || 'error'}] ${params.module}/${params.action}: ${params.message}`);
    return errorLog;
  } catch (err) {
    console.error('Failed to log error:', err);
    return null;
  }
};

// POST /api/errors - Crear nuevo error log
export const createErrorLog = async (req: Request, res: Response) => {
  try {
    const { level, module, action, message, stack, metadata } = req.body;

    if (!module || !action || !message) {
      return res.status(400).json({ error: 'module, action y message son requeridos' });
    }

    const errorLog = await logError({
      level: level || 'error',
      module,
      action,
      message,
      stack,
      userId: (req as any).user?._id?.toString(),
      userEmail: (req as any).user?.email,
      requestData: {
        method: req.method,
        url: req.originalUrl,
        body: req.body
      },
      metadata
    });

    res.status(201).json({ success: true, errorLog });
  } catch (error: any) {
    console.error('Error creating error log:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/errors - Obtener todos los errores
export const getErrorLogs = async (req: Request, res: Response) => {
  try {
    const {
      module,
      level,
      resolved,
      startDate,
      endDate,
      limit = 100,
      page = 1
    } = req.query;

    const filter: any = {};

    if (module) filter.module = module;
    if (level) filter.level = level;
    if (resolved !== undefined) filter.resolved = resolved === 'true';

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate as string);
      if (endDate) filter.timestamp.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [errors, total] = await Promise.all([
      ErrorLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ErrorLog.countDocuments(filter)
    ]);

    // Estadísticas
    const stats = await ErrorLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { module: '$module', level: '$level' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      errors,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      },
      stats
    });
  } catch (error: any) {
    console.error('Error fetching error logs:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/errors/stats - Estadísticas de errores
export const getErrorStats = async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const [byModule, byLevel, byDay, totalUnresolved] = await Promise.all([
      // Por módulo
      ErrorLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: '$module', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      // Por nivel
      ErrorLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: '$level', count: { $sum: 1 } } }
      ]),
      // Por día
      ErrorLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Total sin resolver
      ErrorLog.countDocuments({ resolved: false })
    ]);

    res.json({
      success: true,
      period: `${days} days`,
      stats: {
        byModule,
        byLevel,
        byDay,
        totalUnresolved
      }
    });
  } catch (error: any) {
    console.error('Error fetching error stats:', error);
    res.status(500).json({ error: error.message });
  }
};

// PATCH /api/errors/:id/resolve - Marcar error como resuelto
export const resolveError = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userEmail = (req as any).user?.email;

    const errorLog = await ErrorLog.findByIdAndUpdate(
      id,
      {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: userEmail
      },
      { new: true }
    );

    if (!errorLog) {
      return res.status(404).json({ error: 'Error log no encontrado' });
    }

    res.json({ success: true, errorLog });
  } catch (error: any) {
    console.error('Error resolving error log:', error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/errors/clear - Limpiar errores resueltos
export const clearResolvedErrors = async (req: Request, res: Response) => {
  try {
    const result = await ErrorLog.deleteMany({ resolved: true });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (error: any) {
    console.error('Error clearing resolved errors:', error);
    res.status(500).json({ error: error.message });
  }
};
