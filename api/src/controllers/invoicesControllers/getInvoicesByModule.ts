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

    // Build query - use case-insensitive match for module
    const query: any = { module: { $regex: new RegExp(`^${module}$`, 'i') } };

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Type filter (auth = gastos autoridades vs normal = trasiego)
    // Misma lógica que el modal "Ver registro": AUTH- al inicio, " AUT" al final, o details.documentType
    if (type && type !== 'all') {
      const isAuthCondition = {
        $or: [
          { invoiceNumber: { $regex: /^AUTH-/i } },
          { invoiceNumber: { $regex: / AUT$/i } },
          { 'details.documentType': 'gastos-autoridades' }
        ]
      };
      if (type === 'auth') {
        Object.assign(query, isAuthCondition);
      } else if (type === 'normal') {
        query.$nor = isAuthCondition.$or;
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

    // Date range filter (por fecha de emisión, igual que lo que ve el usuario en la tabla)
    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) {
        // YYYY-MM-DD → inicio del día en UTC
        query.issueDate.$gte = new Date((startDate as string) + 'T00:00:00.000Z');
      }
      if (endDate) {
        // YYYY-MM-DD → fin del día en UTC
        query.issueDate.$lte = new Date((endDate as string) + 'T23:59:59.999Z');
      }
    }

    // Client filter
    if (client && client !== 'all') {
      query.clientName = client;
    }

    // Get total count for pagination
    const total = await invoices.countDocuments(query);
    const pages = Math.ceil(total / limitNum) || 1;

    console.log(`[getInvoicesByModule] module=${module}, page=${pageNum}, limit=${limitNum}, total=${total}, pages=${pages}`);
    console.log(`[getInvoicesByModule] query:`, JSON.stringify(query));

    // Get paginated results
    const moduleInvoices = await invoices
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    console.log(`[getInvoicesByModule] returned ${moduleInvoices.length} invoices`);

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
