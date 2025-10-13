import { Request, Response } from "express";
import AgencyService from "../../database/schemas/agencyServiceSchema";
import AgencyCatalog from "../../database/schemas/agencyCatalogSchema";
import { clients } from "../../database";

// Import response utility
const { response } = require('../../utils');

// Get all agency services with filters
export const getAllAgencyServices = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      clientId,
      pickupLocation,
      dropoffLocation,
      vessel,
      crewName,
      startDate,
      endDate,
      search
    } = req.query;

    // Build query
    const query: any = { module: 'AGENCY' };
    
    if (status) query.status = status;
    if (clientId) query.clientId = clientId;
    if (pickupLocation) query.pickupLocation = { $regex: pickupLocation, $options: 'i' };
    if (dropoffLocation) query.dropoffLocation = { $regex: dropoffLocation, $options: 'i' };
    if (vessel) query.vessel = { $regex: vessel, $options: 'i' };
    if (crewName) query.crewName = { $regex: crewName, $options: 'i' };
    
    if (startDate || endDate) {
      query.pickupDate = {};
      if (startDate) query.pickupDate.$gte = new Date(startDate as string);
      if (endDate) query.pickupDate.$lte = new Date(endDate as string);
    }
    
    if (search) {
      query.$or = [
        { crewName: { $regex: search, $options: 'i' } },
        { vessel: { $regex: search, $options: 'i' } },
        { pickupLocation: { $regex: search, $options: 'i' } },
        { dropoffLocation: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const services = await AgencyService
      .find(query)
      .populate('clientId', 'name tradeName ruc')
      .sort({ pickupDate: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalServices = await AgencyService.countDocuments(query);
    const totalPages = Math.ceil(totalServices / limitNum);

    return response(res, 200, {
      data: {
        services,
        totalPages,
        currentPage: pageNum,
        totalServices,
        filters: {
          status,
          clientId,
          pickupLocation,
          dropoffLocation,
          vessel,
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Error getting agency services:', error);
    return response(res, 500, {
      message: 'Error getting agency services',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create new agency service
export const createAgencyService = async (req: Request, res: Response) => {
  try {
    const {
      pickupDate,
      pickupTime,
      pickupLocation,
      dropoffLocation,
      returnDropoffLocation, // For Round Trip services
      vessel,
      voyage,
      moveType,
      transportCompany,
      driver,
      approve,
      comments,
      crewMembers,
      waitingTime,
      price,
      currency,
      passengerCount,
      clientId,
      // Legacy fields
      crewName,
      crewRank,
      nationality,
      driverName,
      flightInfo,
      serviceCode
    } = req.body;

    // Validate required fields
    if (!pickupDate || !pickupTime || !pickupLocation || !dropoffLocation || !vessel || !clientId) {
      return response(res, 400, {
        message: 'Required fields: pickupDate, pickupTime, pickupLocation, dropoffLocation, vessel, clientId'
      });
    }

    // Validate returnDropoffLocation for Round Trip
    if (moveType === 'RT' && !returnDropoffLocation) {
      return response(res, 400, {
        message: 'Return dropoff location is required for Round Trip services'
      });
    }

    // Validate crew information (either crewMembers array or legacy crewName)
    if (!crewMembers || crewMembers.length === 0) {
      if (!crewName) {
        return response(res, 400, {
          message: 'At least one crew member is required (crewMembers array or crewName)'
        });
      }
    }

    // Validate client (required)
    const clientData = await clients.findById(clientId);
    if (!clientData) {
      return response(res, 404, { message: 'Client not found' });
    }
    if (!(clientData as any).isActive) {
      return response(res, 400, { message: 'Client is not active' });
    }

    // Validate locations exist in catalogs
    const pickupLoc = await (AgencyCatalog as any).findActiveByName('location', pickupLocation);
    if (!pickupLoc) {
      return response(res, 400, { message: `Pickup location "${pickupLocation}" not found in catalog` });
    }

    const dropoffLoc = await (AgencyCatalog as any).findActiveByName('location', dropoffLocation);
    if (!dropoffLoc) {
      return response(res, 400, { message: `Dropoff location "${dropoffLocation}" not found in catalog` });
    }

    // Calculate price if service code is present (legacy)
    let calculatedPrice = price || 0;
    if (!calculatedPrice && serviceCode) {
      const tauliaCode = await (AgencyCatalog as any).findActiveByName('taulia_code', serviceCode);
      if (tauliaCode && tauliaCode.metadata?.price) {
        calculatedPrice = tauliaCode.metadata.price;
      }
    }

    // Create new service
    const newService = new AgencyService({
      module: 'AGENCY',
      status: 'pending',
      pickupDate: new Date(pickupDate),
      serviceDate: new Date(pickupDate), // Auto-map
      pickupTime,
      pickupLocation: pickupLocation.toUpperCase(),
      dropoffLocation: dropoffLocation.toUpperCase(),
      returnDropoffLocation: returnDropoffLocation ? returnDropoffLocation.toUpperCase() : undefined,
      vessel: vessel.toUpperCase(),
      voyage,
      
      // New fields
      crewMembers: crewMembers || [],
      moveType: moveType || 'SINGLE',
      passengerCount: passengerCount || (crewMembers ? crewMembers.length : 1),
      approve: approve || false,
      driver,
      
      // Legacy fields (mantener para compatibilidad)
      crewName,
      crewRank,
      nationality: nationality?.toUpperCase(),
      driverName: driver || driverName,
      flightInfo,
      
      // Service details
      transportCompany,
      waitingTime: waitingTime || 0,
      comments,
      notes: comments, // Auto-map
      serviceCode,
      
      // Pricing
      price: calculatedPrice,
      currency: currency || 'USD',
      
      // Client (required)
      clientId: clientId,
      clientName: (clientData as any).type === 'natural' ? (clientData as any).fullName : (clientData as any).companyName,
      
      // Audit
      createdBy: (req as any).user?._id
    });

    await newService.save();

    return response(res, 201, {
      success: true,
      service: newService,
      message: 'Agency service created successfully'
    });
  } catch (error) {
    console.error('Error creating agency service:', error);
    return response(res, 500, {
      message: 'Error creating agency service',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update agency service
export const updateAgencyService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find service
    const service = await AgencyService.findById(id);
    if (!service) {
      return response(res, 404, { message: 'Service not found' });
    }

    // Check if service can be edited
    // Permitir transición de completed -> facturado (para facturación)
    const isFacturacionTransition = service.status === 'completed' && updateData.status === 'facturado';
    
    if (!isFacturacionTransition && (!service.canBeEdited || !service.canBeEdited())) {
      return response(res, 400, { message: 'Service cannot be edited in current status' });
    }

    // Fields that cannot be updated
    delete updateData.module;
    delete updateData.createdBy;
    delete updateData.createdAt;

    // Re-calculate serviceDate if pickupDate changes
    if (updateData.pickupDate) {
      updateData.serviceDate = new Date(updateData.pickupDate);
    }

    // Re-calculate price if serviceCode changes
    if (updateData.serviceCode && updateData.serviceCode !== service.serviceCode) {
      const tauliaCode = await (AgencyCatalog as any).findActiveByName('taulia_code', updateData.serviceCode);
      if (tauliaCode && tauliaCode.metadata?.price) {
        updateData.price = tauliaCode.metadata.price;
      }
    }

    // Map comments to notes
    if (updateData.comments) {
      updateData.notes = updateData.comments;
    }

    // Update metadata
    updateData.updatedBy = (req as any).user?._id;

    // Perform update
    const updatedService = await AgencyService.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('clientId', 'name tradeName ruc');

    return response(res, 200, {
      success: true,
      service: updatedService,
      message: 'Agency service updated successfully'
    });
  } catch (error) {
    console.error('Error updating agency service:', error);
    return response(res, 500, {
      message: 'Error updating agency service',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete agency service
export const deleteAgencyService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hardDelete = false } = req.query;

    // Find service
    const service = await AgencyService.findById(id);
    if (!service) {
      return response(res, 404, { message: 'Service not found' });
    }

    // Permitir eliminación de todos los estados (incluido facturado)
    if (hardDelete === 'true') {
      // Hard delete
      await AgencyService.findByIdAndDelete(id);
      return response(res, 200, {
        success: true,
        message: 'Agency service permanently deleted'
      });
    } else {
      // Soft delete (mark as inactive by setting status to pending and adding note)
      service.status = 'pending';
      service.notes = (service.notes || '') + ' [CANCELLED]';
      await service.save();
      return response(res, 200, {
        success: true,
        message: 'Agency service cancelled'
      });
    }
  } catch (error) {
    console.error('Error deleting agency service:', error);
    return response(res, 500, {
      message: 'Error deleting agency service',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update agency service status (NEW)
export const updateAgencyServiceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return response(res, 400, { message: 'Status is required' });
    }

    // Validate status value
    const validStatuses = ['pending', 'in_progress', 'completed', 'prefacturado', 'facturado'];
    if (!validStatuses.includes(status)) {
      return response(res, 400, { message: `Invalid status. Valid values: ${validStatuses.join(', ')}` });
    }

    // Find service
    const service = await AgencyService.findById(id);
    if (!service) {
      return response(res, 404, { message: 'Service not found' });
    }

    // Validate status transitions
    const currentStatus = service.status;
    let isValidTransition = false;

    // Define valid transitions
    switch (currentStatus) {
      case 'pending':
        isValidTransition = ['in_progress', 'completed'].includes(status);
        break;
      case 'in_progress':
        isValidTransition = ['completed', 'pending'].includes(status);
        break;
      case 'completed':
        isValidTransition = ['prefacturado', 'pending', 'in_progress'].includes(status);
        break;
      case 'prefacturado':
        isValidTransition = status === 'facturado';
        break;
      case 'facturado':
        isValidTransition = false; // Cannot change from facturado
        break;
    }

    // Allow rollback to pending from any state except facturado
    if (status === 'pending' && currentStatus !== 'facturado') {
      isValidTransition = true;
    }

    if (!isValidTransition) {
      return response(res, 400, {
        message: `Invalid status transition from "${currentStatus}" to "${status}"`
      });
    }

    // Update status
    service.status = status as any;
    service.updatedBy = (req as any).user?._id;
    await service.save();

    return response(res, 200, {
      success: true,
      service,
      message: `Service status updated from "${currentStatus}" to "${status}"`
    });
  } catch (error) {
    console.error('Error updating service status:', error);
    return response(res, 500, {
      message: 'Error updating service status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get services ready for invoicing
export const getServicesForInvoicing = async (req: Request, res: Response) => {
  try {
    const { clientId, startDate, endDate } = req.query;

    const query: any = {
      status: 'completed',
      invoiceId: { $exists: false }
    };

    if (clientId) query.clientId = clientId;
    
    if (startDate || endDate) {
      query.pickupDate = {};
      if (startDate) query.pickupDate.$gte = new Date(startDate as string);
      if (endDate) query.pickupDate.$lte = new Date(endDate as string);
    }

    const services = await AgencyService
      .find(query)
      .populate('clientId', 'name tradeName ruc sapCode')
      .sort({ pickupDate: 1 });

    // Group by client
    const groupedByClient = services.reduce((acc: any, service: any) => {
      const clientKey = service.clientId._id.toString();
      if (!acc[clientKey]) {
        acc[clientKey] = {
          client: service.clientId,
          services: [],
          totalAmount: 0
        };
      }
      acc[clientKey].services.push(service);
      acc[clientKey].totalAmount += service.price || 0;
      return acc;
    }, {});

    return response(res, 200, {
      data: {
        services,
        groupedByClient: Object.values(groupedByClient),
        totalServices: services.length
      }
    });
  } catch (error) {
    console.error('Error getting services for invoicing:', error);
    return response(res, 500, {
      message: 'Error getting services for invoicing',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get service by ID
export const getAgencyServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const service = await AgencyService
      .findById(id)
      .populate('clientId', 'name tradeName ruc sapCode')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!service) {
      return response(res, 404, { message: 'Service not found' });
    }

    return response(res, 200, { data: service });
  } catch (error) {
    console.error('Error getting service:', error);
    return response(res, 500, {
      message: 'Error getting service',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get service statistics
export const getAgencyStatistics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, clientId } = req.query;

    const query: any = { module: 'AGENCY' };
    
    if (clientId) query.clientId = clientId;
    
    if (startDate || endDate) {
      query.pickupDate = {};
      if (startDate) query.pickupDate.$gte = new Date(startDate as string);
      if (endDate) query.pickupDate.$lte = new Date(endDate as string);
    }

    // Get statistics
    const totalServices = await AgencyService.countDocuments(query);
    const pendingServices = await AgencyService.countDocuments({ ...query, status: 'pending' });
    const inProgressServices = await AgencyService.countDocuments({ ...query, status: 'in_progress' });
    const completedServices = await AgencyService.countDocuments({ ...query, status: 'completed' });
    const invoicedServices = await AgencyService.countDocuments({ ...query, status: 'facturado' });

    // Get top vessels
    const topVessels = await AgencyService.aggregate([
      { $match: query },
      { $group: { _id: '$vessel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Get top routes
    const topRoutes = await AgencyService.aggregate([
      { $match: query },
      {
        $group: {
          _id: { pickup: '$pickupLocation', dropoff: '$dropoffLocation' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    return response(res, 200, {
      data: {
        totalServices,
        servicesByStatus: {
          pending: pendingServices,
          inProgress: inProgressServices,
          completed: completedServices,
          invoiced: invoicedServices
        },
        topVessels,
        topRoutes,
        period: {
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    return response(res, 500, {
      message: 'Error getting statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};