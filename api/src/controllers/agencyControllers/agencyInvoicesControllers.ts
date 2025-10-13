import { Request, Response } from 'express';
import { agencyInvoices, agencyServices, clients } from '../../database';
import { response } from '../../utils';

/**
 * @route   GET /api/agency/invoices
 * @desc    Get all agency invoices with filters
 * @access  Private
 */
export const getAllAgencyInvoices = async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      clientId, 
      startDate, 
      endDate,
      page = 1,
      limit = 100
    } = req.query;

    // Build filter
    const filter: any = { module: 'AGENCY' };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (clientId && clientId !== 'all') {
      filter.clientId = clientId;
    }

    if (startDate || endDate) {
      filter.issueDate = {};
      if (startDate) {
        filter.issueDate.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.issueDate.$lte = end;
      }
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get invoices
    const invoices = await agencyInvoices
      .find(filter)
      .populate('clientId', 'fullName companyName type ruc sapCode')
      .populate('relatedServiceIds', 'pickupDate vessel crewMembers moveType price currency')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ issueDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalCount = await agencyInvoices.countDocuments(filter);

    return response(res, 200, {
      success: true,
      invoices,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalInvoices: totalCount,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Error getting agency invoices:', error);
    return response(res, 500, {
      success: false,
      message: 'Error getting agency invoices',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   GET /api/agency/invoices/:id
 * @desc    Get single agency invoice by ID
 * @access  Private
 */
export const getAgencyInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await agencyInvoices
      .findById(id)
      .populate('clientId', 'fullName companyName type ruc sapCode email phone')
      .populate('relatedServiceIds')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    if (!invoice) {
      return response(res, 404, {
        success: false,
        message: 'Invoice not found'
      });
    }

    return response(res, 200, {
      success: true,
      invoice
    });
  } catch (error) {
    console.error('Error getting agency invoice:', error);
    return response(res, 500, {
      success: false,
      message: 'Error getting agency invoice',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   POST /api/agency/invoices
 * @desc    Create new agency invoice (prefactura)
 * @access  Private
 */
export const createAgencyInvoice = async (req: Request, res: Response) => {
  try {
    const {
      invoiceNumber,
      clientId,
      relatedServiceIds,
      issueDate,
      dueDate,
      details
    } = req.body;

    // Validations
    if (!invoiceNumber || !clientId || !relatedServiceIds || relatedServiceIds.length === 0) {
      return response(res, 400, {
        success: false,
        message: 'Required fields: invoiceNumber, clientId, relatedServiceIds'
      });
    }

    // Validate client
    const client = await clients.findById(clientId);
    if (!client) {
      return response(res, 404, {
        success: false,
        message: 'Client not found'
      });
    }

    if (!(client as any).isActive) {
      return response(res, 400, {
        success: false,
        message: 'Client is not active'
      });
    }

    if (!(client as any).sapCode) {
      return response(res, 400, {
        success: false,
        message: 'Client does not have a SAP code'
      });
    }

    // Validate services exist
    const services = await agencyServices.find({
      _id: { $in: relatedServiceIds }
    });

    if (services.length !== relatedServiceIds.length) {
      return response(res, 400, {
        success: false,
        message: 'One or more services not found'
      });
    }

    // Check if invoice number already exists
    const existingInvoice = await agencyInvoices.findOne({ invoiceNumber });
    if (existingInvoice) {
      return response(res, 409, {
        success: false,
        message: `Invoice number ${invoiceNumber} already exists`
      });
    }

    // Calculate total amount from services
    let totalAmount = services.reduce((sum, service) => sum + (service.price || 0), 0);

    // Add TRK137 amount if provided
    if (details?.trk137Amount) {
      totalAmount += details.trk137Amount;
    }

    // Add additional services if provided
    if (details?.additionalServices && Array.isArray(details.additionalServices)) {
      totalAmount += details.additionalServices.reduce((sum: number, service: any) => sum + (service.amount || 0), 0);
    }

    // Create invoice
    const newInvoice = new agencyInvoices({
      module: 'AGENCY',
      invoiceNumber: invoiceNumber.toUpperCase(),
      status: 'prefactura',
      clientId,
      clientName: (client as any).type === 'natural' ? (client as any).fullName : (client as any).companyName,
      clientRuc: (client as any).ruc || (client as any).documentNumber,
      clientSapNumber: (client as any).sapCode,
      relatedServiceIds,
      totalAmount,
      currency: 'USD',
      issueDate: issueDate || new Date(),
      dueDate,
      details,
      sentToSap: false,
      createdBy: (req as any).user?._id
    });

    await newInvoice.save();

    // Update services to mark them as invoiced
    await agencyServices.updateMany(
      { _id: { $in: relatedServiceIds } },
      { 
        $set: { 
          status: 'ready_for_invoice',
          prefacturaId: newInvoice._id
        } 
      }
    );

    return response(res, 201, {
      success: true,
      invoice: newInvoice,
      message: 'Agency invoice created successfully'
    });
  } catch (error) {
    console.error('Error creating agency invoice:', error);
    return response(res, 500, {
      success: false,
      message: 'Error creating agency invoice',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   PUT /api/agency/invoices/:id
 * @desc    Update agency invoice
 * @access  Private
 */
export const updateAgencyInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const invoice = await agencyInvoices.findById(id);
    if (!invoice) {
      return response(res, 404, {
        success: false,
        message: 'Invoice not found'
      });
    }

    // Don't allow updating if already facturada (unless updating XML/SAP fields)
    if (invoice.status === 'facturada' && updates.status !== 'facturada') {
      const allowedFields = ['xmlData', 'sentToSap', 'sentToSapAt', 'sapFileName', 'sapLogs'];
      const hasDisallowedUpdates = Object.keys(updates).some(key => !allowedFields.includes(key));
      
      if (hasDisallowedUpdates) {
        return response(res, 400, {
          success: false,
          message: 'Cannot update facturada invoice. Only XML and SAP fields can be updated.'
        });
      }
    }

    // Update invoice
    Object.assign(invoice, updates);
    invoice.updatedBy = (req as any).user?._id;
    await invoice.save();

    return response(res, 200, {
      success: true,
      invoice,
      message: 'Invoice updated successfully'
    });
  } catch (error) {
    console.error('Error updating agency invoice:', error);
    return response(res, 500, {
      success: false,
      message: 'Error updating agency invoice',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   DELETE /api/agency/invoices/:id
 * @desc    Delete agency invoice
 * @access  Private
 */
export const deleteAgencyInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await agencyInvoices.findById(id);
    if (!invoice) {
      return response(res, 404, {
        success: false,
        message: 'Invoice not found'
      });
    }

    // Update related services to remove invoice reference
    await agencyServices.updateMany(
      { _id: { $in: invoice.relatedServiceIds } },
      { 
        $set: { 
          status: 'completed',
        },
        $unset: { 
          prefacturaId: '',
          invoiceId: ''
        }
      }
    );

    // Delete invoice
    await agencyInvoices.findByIdAndDelete(id);

    return response(res, 200, {
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting agency invoice:', error);
    return response(res, 500, {
      success: false,
      message: 'Error deleting agency invoice',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route   POST /api/agency/invoices/:id/facturar
 * @desc    Convert prefactura to factura and generate XML
 * @access  Private
 */
export const facturarAgencyInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { xmlData, newInvoiceNumber, invoiceDate } = req.body;

    const invoice = await agencyInvoices.findById(id);
    if (!invoice) {
      return response(res, 404, {
        success: false,
        message: 'Invoice not found'
      });
    }

    if (invoice.status === 'facturada') {
      return response(res, 400, {
        success: false,
        message: 'Invoice is already facturada'
      });
    }

    // Update invoice to facturada
    invoice.status = 'facturada';
    if (newInvoiceNumber) {
      invoice.invoiceNumber = newInvoiceNumber.toUpperCase();
    }
    if (invoiceDate) {
      invoice.issueDate = new Date(invoiceDate);
    }
    if (xmlData) {
      invoice.xmlData = {
        xml: xmlData.xml,
        fileName: xmlData.fileName || `${invoice.invoiceNumber}.xml`,
        generatedAt: new Date()
      };
    }
    invoice.updatedBy = (req as any).user?._id;
    await invoice.save();

    // Update related services to facturado
    await agencyServices.updateMany(
      { _id: { $in: invoice.relatedServiceIds } },
      { 
        $set: { 
          status: 'facturado',
          invoiceId: invoice._id
        }
      }
    );

    return response(res, 200, {
      success: true,
      invoice,
      message: 'Invoice facturada successfully'
    });
  } catch (error) {
    console.error('Error facturando agency invoice:', error);
    return response(res, 500, {
      success: false,
      message: 'Error facturando agency invoice',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

