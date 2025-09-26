import { Request, Response } from "express";
import AgencyCatalog from "../../database/schemas/agencyCatalogSchema";
import { response } from "../../utils";

interface ImportedCatalog {
  type: string;
  name: string;
  description?: string;
  code?: string;
  isActive?: boolean;
  metadata?: any;
}

// Export all catalogs to JSON format
export const exportAgencyCatalogs = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    
    let query: any = {};
    if (type) {
      query.type = type;
    }
    
    const catalogs = await AgencyCatalog.find(query).sort({ type: 1, name: 1 });
    
    // Format for export
    const exportData = catalogs.map(catalog => ({
      type: catalog.type,
      name: catalog.name,
      description: catalog.description,
      code: catalog.code,
      isActive: catalog.isActive,
      metadata: catalog.metadata
    }));
    
    return response(res, 200, {
      message: `Exportados ${exportData.length} catálogos`,
      data: exportData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error exportando catálogos de Agency:', error);
    return response(res, 500, {
      message: 'Error al exportar catálogos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Import catalogs from JSON
export const importAgencyCatalogs = async (req: Request, res: Response) => {
  try {
    const { catalogs, overwriteDuplicates = false } = req.body;
    
    if (!catalogs || !Array.isArray(catalogs) || catalogs.length === 0) {
      return response(res, 400, { 
        message: 'Se requiere un array de catálogos válido' 
      });
    }
    
    const results = {
      success: 0,
      errors: 0,
      duplicates: 0,
      errorsList: [] as string[],
      updatedRoutes: 0
    };
    
    const BATCH_SIZE = 50;
    const totalCatalogs = catalogs.length;
    
    console.log(`Iniciando importación de ${totalCatalogs} catálogos de Agency. Sobrescribir duplicados: ${overwriteDuplicates}`);
    
    // Process in batches
    for (let i = 0; i < catalogs.length; i += BATCH_SIZE) {
      const batch = catalogs.slice(i, i + BATCH_SIZE);
      const batchPromises = [];
      
      for (const catalogData of batch) {
        batchPromises.push(processCatalog(catalogData, results, overwriteDuplicates));
      }
      
      await Promise.allSettled(batchPromises);
      
      const processed = Math.min(i + BATCH_SIZE, totalCatalogs);
      console.log(`Procesados ${processed}/${totalCatalogs} catálogos (${Math.round((processed / totalCatalogs) * 100)}%)`);
    }
    
    // Special handling for route_pricing catalogs to update existing pricing data
    if (catalogs.some(c => c.type === 'route_pricing')) {
      await updateRoutePricingFromPDF(catalogs.filter(c => c.type === 'route_pricing'), results);
    }
    
    return response(res, 200, {
      message: `Importación completada. ${results.success} catálogos importados, ${results.duplicates} duplicados, ${results.errors} errores`,
      data: {
        success: results.success,
        duplicates: results.duplicates,
        errors: results.errors,
        updatedRoutes: results.updatedRoutes,
        errorsList: results.errorsList.slice(0, 50)
      }
    });
    
  } catch (error) {
    console.error('Error en importación masiva de catálogos de Agency:', error);
    return response(res, 500, {
      message: 'Error interno del servidor durante la importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Process individual catalog
async function processCatalog(catalogData: ImportedCatalog, results: any, overwriteDuplicates: boolean = false): Promise<void> {
  try {
    // Validate required fields
    const missingFields = [];
    if (!catalogData.type) missingFields.push('type');
    if (!catalogData.name) missingFields.push('name');
    
    if (missingFields.length > 0) {
      results.errors++;
      results.errorsList.push(`Catálogo con campos faltantes (${missingFields.join(', ')}): ${JSON.stringify(catalogData)}`);
      return;
    }
    
    // Validate catalog type
    const validTypes = ['location', 'nationality', 'rank', 'vessel', 'transport_company', 'driver', 'taulia_code', 'route_pricing'];
    if (!validTypes.includes(catalogData.type)) {
      results.errors++;
      results.errorsList.push(`Tipo de catálogo inválido: ${catalogData.type}`);
      return;
    }
    
    // Check for existing catalog
    const searchCriteria = {
      type: catalogData.type,
      name: catalogData.name
    };
    
    const existingCatalog = await AgencyCatalog.findOne(searchCriteria);
    
    if (existingCatalog) {
      if (overwriteDuplicates) {
        // Update existing catalog
        await AgencyCatalog.findByIdAndUpdate(existingCatalog._id, {
          description: catalogData.description || existingCatalog.description,
          code: catalogData.code || existingCatalog.code,
          isActive: catalogData.isActive !== undefined ? catalogData.isActive : existingCatalog.isActive,
          metadata: catalogData.metadata || existingCatalog.metadata
        });
        results.success++;
        console.log(`Catálogo actualizado: ${existingCatalog._id}`);
      } else {
        results.duplicates++;
        console.log(`Catálogo duplicado: ${catalogData.type} - ${catalogData.name}`);
      }
      return;
    }
    
    // Create new catalog
    const newCatalog = new AgencyCatalog({
      type: catalogData.type,
      name: catalogData.name,
      description: catalogData.description || '',
      code: catalogData.code || '',
      isActive: catalogData.isActive !== undefined ? catalogData.isActive : true,
      metadata: catalogData.metadata || {}
    });
    
    await newCatalog.save();
    results.success++;
    
  } catch (error) {
    results.errors++;
    const errorMessage = `Error procesando catálogo: ${error instanceof Error ? error.message : 'Error desconocido'}`;
    results.errorsList.push(errorMessage);
    console.error('Error procesando catálogo:', errorMessage, 'Datos:', JSON.stringify(catalogData));
  }
}

// Special function to update route pricing from PDF data
async function updateRoutePricingFromPDF(routePricingData: any[], results: any): Promise<void> {
  try {
    // Predefined routes from Agency PDF
    const pdfRoutes = [
      { from: "HOTEL PTY", to: "PTY PORT", base: 120, serviceCode: "ECR000669", description: "HOTEL/PORT PTY" },
      { from: "PTY PORT", to: "HOTEL PTY", base: 120, serviceCode: "ECR000671", description: "PORT/HOTEL PTY" },
      { from: "HOTEL PTY", to: "AIRPORT PTY", base: 85, serviceCode: "ECR000673", description: "HOTEL/AIRPORT PTY" },
      { from: "AIRPORT PTY", to: "HOTEL PTY", base: 85, serviceCode: "ECR000675", description: "AIRPORT/HOTEL PTY" },
      { from: "HOTEL COL", to: "CCT", base: 120, serviceCode: "ECR000677", description: "HOTEL/PORT COLON" },
      { from: "CCT", to: "HOTEL COL", base: 120, serviceCode: "ECR000679", description: "PORT/HOTEL COLON" },
      // Add more routes as needed
    ];
    
    for (const route of pdfRoutes) {
      const existingRoute = await AgencyCatalog.findOne({
        type: 'route_pricing',
        'metadata.fromLocation': route.from,
        'metadata.toLocation': route.to
      });
      
      if (!existingRoute) {
        const newRoute = new AgencyCatalog({
          type: 'route_pricing',
          name: `${route.from} → ${route.to}`,
          description: route.description,
          code: route.serviceCode,
          isActive: true,
          metadata: {
            fromLocation: route.from,
            toLocation: route.to,
            basePrice: route.base,
            pricePerPerson: 20, // Default $20 per extra person
            waitingTimePrice: 10, // Default $10 per hour
            currency: 'USD'
          }
        });
        
        await newRoute.save();
        results.updatedRoutes++;
      }
    }
    
    console.log(`Actualizadas ${results.updatedRoutes} rutas de precios desde PDF`);
    
  } catch (error) {
    console.error('Error actualizando rutas de precios:', error);
    results.errorsList.push('Error actualizando rutas de precios desde PDF');
  }
}

// Bulk delete catalogs
export const bulkDeleteAgencyCatalogs = async (req: Request, res: Response) => {
  try {
    const { catalogIds, type } = req.body;
    
    let deleteQuery: any = {};
    
    if (catalogIds && Array.isArray(catalogIds) && catalogIds.length > 0) {
      deleteQuery._id = { $in: catalogIds };
    } else if (type) {
      deleteQuery.type = type;
    } else {
      return response(res, 400, { 
        message: 'Se requiere catalogIds o type para eliminar' 
      });
    }
    
    const result = await AgencyCatalog.deleteMany(deleteQuery);
    
    return response(res, 200, {
      message: `${result.deletedCount} catálogos eliminados exitosamente`,
      data: {
        deletedCount: result.deletedCount
      }
    });
    
  } catch (error) {
    console.error('Error eliminando catálogos:', error);
    return response(res, 500, {
      message: 'Error al eliminar catálogos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default {
  exportAgencyCatalogs,
  importAgencyCatalogs,
  bulkDeleteAgencyCatalogs
};