import { Request, Response } from "express";
import AgencyCatalog, { CatalogType } from "../../database/schemas/agencyCatalogSchema";
import { agencyCatalogSeedData } from "../../database/seeds/agencyCatalogSeed";

// Import response utility
const { response } = require('../../utils');

// Valid catalog types
const VALID_CATALOG_TYPES: CatalogType[] = [
  'location',
  'nationality',
  'rank',
  'vessel',
  'transport_company',
  'driver',
  'taulia_code',
  'route_pricing',
  'crew_rank',
  'crew_change_service'
];

// Validate metadata based on catalog type
const validateMetadata = (type: CatalogType, metadata: any): { valid: boolean; error?: string } => {
  if (!metadata) return { valid: true };

  switch (type) {
    case 'location':
      if (metadata.siteType && typeof metadata.siteType !== 'string') {
        return { valid: false, error: 'siteType must be a string' };
      }
      break;
    
    case 'taulia_code':
      if (metadata.price !== undefined && typeof metadata.price !== 'number') {
        return { valid: false, error: 'price must be a number' };
      }
      if (metadata.category && typeof metadata.category !== 'string') {
        return { valid: false, error: 'category must be a string' };
      }
      break;
    
    case 'rank':
      if (metadata.company && typeof metadata.company !== 'string') {
        return { valid: false, error: 'company must be a string' };
      }
      if (metadata.level !== undefined && typeof metadata.level !== 'number') {
        return { valid: false, error: 'level must be a number' };
      }
      break;
    
    case 'driver':
      if (metadata.phone && typeof metadata.phone !== 'string') {
        return { valid: false, error: 'phone must be a string' };
      }
      if (metadata.company && typeof metadata.company !== 'string') {
        return { valid: false, error: 'company must be a string' };
      }
      break;
    
    case 'route_pricing':
      if (metadata.basePrice !== undefined && typeof metadata.basePrice !== 'number') {
        return { valid: false, error: 'basePrice must be a number' };
      }
      if (metadata.pricePerPerson !== undefined && typeof metadata.pricePerPerson !== 'number') {
        return { valid: false, error: 'pricePerPerson must be a number' };
      }
      if (metadata.waitingTimePrice !== undefined && typeof metadata.waitingTimePrice !== 'number') {
        return { valid: false, error: 'waitingTimePrice must be a number' };
      }
      if (metadata.fromLocation && typeof metadata.fromLocation !== 'string') {
        return { valid: false, error: 'fromLocation must be a string' };
      }
      if (metadata.toLocation && typeof metadata.toLocation !== 'string') {
        return { valid: false, error: 'toLocation must be a string' };
      }
      break;
  }

  return { valid: true };
};

// Get catalogs by type
export const getCatalogsByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { active = 'true', search, includeMetadata = 'true' } = req.query;

    // Validate type
    if (!VALID_CATALOG_TYPES.includes(type as CatalogType)) {
      return response(res, 400, {
        message: `Invalid catalog type. Valid types: ${VALID_CATALOG_TYPES.join(', ')}`
      });
    }

    // Build query
    let query: any = {
      type,
      isActive: active === 'true'
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query
    const catalogs = await AgencyCatalog
      .find(query)
      .select(includeMetadata === 'false' ? '-metadata' : '')
      .sort({ name: 1 });

    return response(res, 200, {
      success: true,
      type,
      catalogs,
      count: catalogs.length
    });
  } catch (error) {
    console.error('Error getting catalogs by type:', error);
    return response(res, 500, {
      message: 'Error getting catalogs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get all catalogs grouped by type
export const getAllCatalogs = async (req: Request, res: Response) => {
  try {
    const { active = 'true' } = req.query;

    const query = active === 'true' ? { isActive: true } : {};
    
    const catalogs = await AgencyCatalog.find(query).sort({ type: 1, name: 1 });
    
    // Group by type
    const grouped: Record<CatalogType, any[]> = {
      location: [],
      nationality: [],
      rank: [],
      vessel: [],
      transport_company: [],
      driver: [],
      taulia_code: [],
      route_pricing: [],
      crew_rank: [],
      crew_change_service: []
    };

    catalogs.forEach(catalog => {
      if (grouped[catalog.type]) {
        grouped[catalog.type].push(catalog);
      }
    });

    // Get counts
    const counts = {
      location: grouped.location.length,
      nationality: grouped.nationality.length,
      rank: grouped.rank.length,
      vessel: grouped.vessel.length,
      transport_company: grouped.transport_company.length,
      driver: grouped.driver.length,
      taulia_code: grouped.taulia_code.length,
      route_pricing: grouped.route_pricing.length,
      crew_rank: grouped.crew_rank.length,
      crew_change_service: grouped.crew_change_service.length,
      total: catalogs.length
    };

    return response(res, 200, {
      success: true,
      catalogs: grouped,
      counts
    });
  } catch (error) {
    console.error('Error getting all catalogs:', error);
    return response(res, 500, {
      message: 'Error getting catalogs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create catalog entry
export const createCatalogEntry = async (req: Request, res: Response) => {
  try {
    const { type, name, code, description, metadata } = req.body;

    // Validate required fields
    if (!type || !name) {
      return response(res, 400, {
        message: 'Type and name are required'
      });
    }

    // Validate type
    if (!VALID_CATALOG_TYPES.includes(type)) {
      return response(res, 400, {
        message: `Invalid catalog type. Valid types: ${VALID_CATALOG_TYPES.join(', ')}`
      });
    }

    // Validate metadata
    const metadataValidation = validateMetadata(type, metadata);
    if (!metadataValidation.valid) {
      return response(res, 400, {
        message: `Invalid metadata: ${metadataValidation.error}`
      });
    }

    // Check if name already exists for this type
    const existing = await AgencyCatalog.findOne({
      type,
      name: name.trim().toUpperCase()
    });

    if (existing) {
      return response(res, 409, {
        message: `Entry with name "${name}" already exists for type "${type}"`
      });
    }

    // Check if code already exists (if provided)
    if (code) {
      const existingCode = await AgencyCatalog.findOne({ code });
      if (existingCode) {
        return response(res, 409, {
          message: `Entry with code "${code}" already exists`
        });
      }
    }

    // Create new catalog entry
    const newEntry = new AgencyCatalog({
      type,
      name: name.trim(),
      code,
      description,
      metadata: metadata || {},
      isActive: true
    });

    await newEntry.save();

    return response(res, 201, {
      success: true,
      catalog: newEntry,
      message: 'Catalog entry created successfully'
    });
  } catch (error) {
    console.error('Error creating catalog entry:', error);
    
    // Handle duplicate key error
    if ((error as any).code === 11000) {
      return response(res, 409, {
        message: 'Duplicate entry detected',
        error: 'An entry with this name already exists for this type'
      });
    }

    return response(res, 500, {
      message: 'Error creating catalog entry',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update catalog entry
export const updateCatalogEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, description, metadata, isActive } = req.body;

    // Find entry
    const entry = await AgencyCatalog.findById(id);
    if (!entry) {
      return response(res, 404, { message: 'Catalog entry not found' });
    }

    // If name is being changed, check for duplicates
    if (name && name !== entry.name) {
      const existing = await AgencyCatalog.findOne({
        type: entry.type,
        name: name.trim().toUpperCase(),
        _id: { $ne: id }
      });

      if (existing) {
        return response(res, 409, {
          message: `Entry with name "${name}" already exists for type "${entry.type}"`
        });
      }
    }

    // If code is being changed, check for duplicates
    if (code && code !== entry.code) {
      const existingCode = await AgencyCatalog.findOne({
        code,
        _id: { $ne: id }
      });

      if (existingCode) {
        return response(res, 409, {
          message: `Entry with code "${code}" already exists`
        });
      }
    }

    // Validate metadata if provided
    if (metadata) {
      const metadataValidation = validateMetadata(entry.type, metadata);
      if (!metadataValidation.valid) {
        return response(res, 400, {
          message: `Invalid metadata: ${metadataValidation.error}`
        });
      }
    }

    // Update fields
    if (name !== undefined) entry.name = name.trim();
    if (code !== undefined) entry.code = code;
    if (description !== undefined) entry.description = description;
    if (metadata !== undefined) entry.metadata = metadata;
    if (isActive !== undefined) entry.isActive = isActive;

    await entry.save();

    return response(res, 200, {
      success: true,
      catalog: entry,
      message: 'Catalog entry updated successfully'
    });
  } catch (error) {
    console.error('Error updating catalog entry:', error);
    
    // Handle duplicate key error
    if ((error as any).code === 11000) {
      return response(res, 409, {
        message: 'Duplicate entry detected',
        error: 'An entry with this name or code already exists'
      });
    }

    return response(res, 500, {
      message: 'Error updating catalog entry',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete catalog entry (soft delete)
export const deleteCatalogEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { force = 'false' } = req.query;

    // Find entry
    const entry = await AgencyCatalog.findById(id);
    if (!entry) {
      return response(res, 404, { message: 'Catalog entry not found' });
    }

    // Check if entry is being used in active services
    if (entry.type === 'location') {
      const AgencyService = require('../../database/schemas/agencyServiceSchema').default;
      const servicesUsingLocation = await AgencyService.countDocuments({
        $or: [
          { pickupLocation: entry.name },
          { dropoffLocation: entry.name }
        ],
        status: { $nin: ['cancelled', 'facturado'] }
      });

      if (servicesUsingLocation > 0) {
        return response(res, 400, {
          message: `Cannot delete location "${entry.name}" as it is being used in ${servicesUsingLocation} active services`
        });
      }
    }

    if (force === 'true') {
      // Hard delete
      await AgencyCatalog.findByIdAndDelete(id);
      return response(res, 200, {
        success: true,
        message: 'Catalog entry permanently deleted'
      });
    } else {
      // Soft delete
      entry.isActive = false;
      await entry.save();
      return response(res, 200, {
        success: true,
        catalog: entry,
        message: 'Catalog entry deactivated'
      });
    }
  } catch (error) {
    console.error('Error deleting catalog entry:', error);
    return response(res, 500, {
      message: 'Error deleting catalog entry',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Seed catalogs with initial data
export const seedCatalogs = async (req: Request, res: Response) => {
  try {
    const { force = 'false', types } = req.body;

    // Check if data already exists
    const existingCount = await AgencyCatalog.countDocuments();
    
    if (existingCount > 0 && force !== 'true') {
      return response(res, 400, {
        message: `Catalogs already contain ${existingCount} entries. Use force=true to replace all data.`
      });
    }

    // If force, clear existing data
    if (force === 'true') {
      await AgencyCatalog.deleteMany({});
      console.log('Cleared existing catalog data');
    }

    let insertedCounts: any = {};
    let totalInserted = 0;

    // Seed specific types or all
    const typesToSeed = types || VALID_CATALOG_TYPES;

    for (const type of typesToSeed) {
      let dataToInsert: any[] = [];

      switch (type) {
        case 'location':
          dataToInsert = agencyCatalogSeedData.locations;
          break;
        case 'nationality':
          dataToInsert = agencyCatalogSeedData.nationalities;
          break;
        case 'rank':
          dataToInsert = agencyCatalogSeedData.ranks;
          break;
        case 'vessel':
          dataToInsert = agencyCatalogSeedData.vessels;
          break;
        case 'transport_company':
          dataToInsert = agencyCatalogSeedData.transportCompanies;
          break;
        case 'driver':
          dataToInsert = agencyCatalogSeedData.drivers;
          break;
        case 'taulia_code':
          dataToInsert = agencyCatalogSeedData.tauliaCodes;
          break;
      }

      if (dataToInsert.length > 0) {
        const result = await AgencyCatalog.insertMany(dataToInsert, { ordered: false });
        insertedCounts[type] = result.length;
        totalInserted += result.length;
      }
    }

    return response(res, 201, {
      success: true,
      message: 'Catalog data seeded successfully',
      insertedCounts,
      totalInserted
    });
  } catch (error) {
    console.error('Error seeding catalogs:', error);
    
    // Handle duplicate key errors gracefully
    if ((error as any).code === 11000) {
      return response(res, 207, {
        message: 'Partial success: Some entries already existed',
        error: 'Duplicate entries were skipped'
      });
    }

    return response(res, 500, {
      message: 'Error seeding catalogs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Search catalogs across all types
export const searchCatalogs = async (req: Request, res: Response) => {
  try {
    const { q, types, limit = 20 } = req.query;

    if (!q) {
      return response(res, 400, { message: 'Search query (q) is required' });
    }

    let query: any = {
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    };

    // Filter by specific types if provided
    if (types) {
      const typeArray = Array.isArray(types) ? types : (types as string).split(',');
      const validTypes = typeArray.filter(t => VALID_CATALOG_TYPES.includes(t as CatalogType));
      if (validTypes.length > 0) {
        query.type = { $in: validTypes };
      }
    }

    const results = await AgencyCatalog
      .find(query)
      .limit(parseInt(limit as string))
      .sort({ type: 1, name: 1 });

    return response(res, 200, {
      success: true,
      query: q,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Error searching catalogs:', error);
    return response(res, 500, {
      message: 'Error searching catalogs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Reactivate catalog entry
export const reactivateCatalogEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const entry = await AgencyCatalog.findById(id);
    if (!entry) {
      return response(res, 404, { message: 'Catalog entry not found' });
    }

    if (entry.isActive) {
      return response(res, 400, { message: 'Catalog entry is already active' });
    }

    entry.isActive = true;
    await entry.save();

    return response(res, 200, {
      success: true,
      catalog: entry,
      message: 'Catalog entry reactivated successfully'
    });
  } catch (error) {
    console.error('Error reactivating catalog entry:', error);
    return response(res, 500, {
      message: 'Error reactivating catalog entry',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};