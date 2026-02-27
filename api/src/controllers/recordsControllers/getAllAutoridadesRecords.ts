import { Request, Response } from 'express';
import { recordsAutoridades } from '../../database';

// Extender la interfaz Request para incluir user
interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    id: string;
    mongoId: string;
    email: string;
    name: string;
    role: string;
    modules: string[];
    isActive: boolean;
  };
}

export async function getAllAutoridadesRecords(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      page,
      limit,
      status,
      auth,
      search,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query: any = {};

    // Status filter (exclude prefacturado/facturado by default unless status=all)
    if (status === 'all') {
      // No filter - show all statuses including prefacturado/facturado
    } else if (status && status !== 'all') {
      // Specific status filter
      query.status = status;
    } else {
      // Default: exclude prefacturado and facturado (only show pending/cargado records)
      query.status = { $nin: ['prefacturado', 'facturado'] };
    }

    // Auth type filter (APA/QUA)
    if (auth && auth !== 'all') {
      query.auth = { $regex: new RegExp(`^${auth}$`, 'i') };
    }

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { blNumber: searchRegex },
        { noInvoice: searchRegex },
        { ruta: searchRegex },
        { customer: searchRegex },
        { container: searchRegex }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const endDateObj = new Date(endDate as string);
        endDateObj.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDateObj;
      }
    }

    // If pagination is requested
    if (page && limit) {
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skip = (pageNum - 1) * limitNum;

      const total = await recordsAutoridades.countDocuments(query);
      const pages = Math.ceil(total / limitNum) || 1;

      console.log(`[getAllAutoridadesRecords] page=${pageNum}, limit=${limitNum}, total=${total}, pages=${pages}`);

      const records = await recordsAutoridades
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      return res.json({
        success: true,
        data: records,
        pagination: {
          current: pageNum,
          pages,
          total,
          limit: limitNum
        }
      });
    }

    // No pagination - return all records
    const records = await recordsAutoridades.find(query).sort({ createdAt: -1 });
    res.json(records);
  } catch (error: any) {
    console.error('[getAllAutoridadesRecords] Error:', error);
    res.status(500).json({ error: error.message });
  }
}


