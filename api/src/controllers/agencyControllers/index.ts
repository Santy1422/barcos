// Agency Services Controllers
export {
  getAllAgencyServices,
  createAgencyService,
  updateAgencyService,
  deleteAgencyService,
  updateAgencyServiceStatus,
  getServicesForInvoicing,
  getAgencyServiceById,
  getAgencyStatistics
} from './agencyServicesControllers';

// Agency Catalogs Controllers
export {
  getCatalogsByType,
  getAllCatalogs,
  createCatalogEntry,
  updateCatalogEntry,
  deleteCatalogEntry,
  seedCatalogs,
  searchCatalogs,
  reactivateCatalogEntry
} from '../agencyCatalogsControllers/agencyCatalogsControllers';

// Agency File Upload Controllers
export {
  uploadServicePDF,
  getServiceFiles,
  deleteServiceFile,
  downloadServiceFile,
  viewServiceFile,
  bulkUploadServicePDFs,
  cleanupOrphanedFiles,
  upload
} from './agencyFileUploadControllers';

// Export all controllers as default object for convenience
import * as agencyServicesControllers from './agencyServicesControllers';
import * as agencyCatalogsControllers from '../agencyCatalogsControllers/agencyCatalogsControllers';
import * as agencyFileUploadControllers from './agencyFileUploadControllers';

const agencyControllers = {
  // Services
  ...agencyServicesControllers,
  // Catalogs
  ...agencyCatalogsControllers,
  // Files
  ...agencyFileUploadControllers
};

export default agencyControllers;