import { invoices } from "../../database";
import { response } from "../../utils";

export default async (req, res) => {
  try {
    const { module } = req.params;
    const {
      page = 1,
      limit = 50,
      status,
      type,
      search,
      startDate,
      endDate,
      client
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = { module };

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Type filter (auth vs normal)
    if (type && type !== 'all') {
      if (type === 'auth') {
        query.invoiceNumber = { $regex: /^AUTH-/i };
      } else if (type === 'normal') {
        query.invoiceNumber = { $not: { $regex: /^AUTH-/i } };
      }
    }

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { invoiceNumber: searchRegex },
        { clientName: searchRegex }
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

    // Client filter
    if (client && client !== 'all') {
      query.clientName = client;
    }

    // Get total count for pagination
    const total = await invoices.countDocuments(query);
    const pages = Math.ceil(total / limitNum);

    // Get paginated results
    const moduleInvoices = await invoices
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return response(res, 200, {
      success: true,
      invoices: moduleInvoices,
      data: moduleInvoices,
      pagination: {
        current: pageNum,
        pages,
        total,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error("Error al obtener facturas por módulo:", error);
    return response(res, 500, { error: "Error al obtener facturas por módulo" });
  }
};
