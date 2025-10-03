import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { AppDispatch } from '../../store';
import {
  // Actions
  fetchAgencyServices,
  createAgencyService,
  updateAgencyService,
  updateServiceStatus,
  deleteAgencyService,
  fetchServiceById,
  fetchAgencyStatistics,
  setFilters,
  clearFilters,
  setPagination,
  setLoading,
  setError,
  clearError,
  setIsCreating,
  setIsUpdating,
  openViewModal,
  openEditModal,
  openStatusModal,
  closeModals,
  setSelectedService,
  setCurrentService,
  clearCurrentService,
  
  // Pricing Actions
  calculateServicePrice,
  clearPricingState,
  setPricing,
  setPricingLoading,
  setPricingError,
  
  // SAP Actions
  fetchServicesReadyForInvoice,
  generateSapXml,
  downloadSapXml,
  fetchSapXmlHistory,
  clearSapState,
  setSapLoading,
  setSapError,
  setReadyForInvoice,
  setSapXmlGenerated,
  
  // Types
  type AgencyService,
  type AgencyServiceInput,
  type AgencyServiceFilters,
  type FetchServicesParams,
  type UpdateStatusParams,
  type UpdateServiceParams,
  type AgencyStatistics,
  type SapXmlGenerationRequest,
  type SapIntegrationState,
  type PricingState,
  type PriceCalculationRequest,
} from './agencyServicesSlice';

// State type for selector
interface AgencyServicesState {
  agencyServices: {
    services: AgencyService[];
    currentService: AgencyService | null;
    totalPages: number;
    currentPage: number;
    totalServices: number;
    filters: AgencyServiceFilters;
    loading: boolean;
    error: string | null;
    isCreating: boolean;
    isUpdating: boolean;
    showViewModal: boolean;
    showEditModal: boolean;
    showStatusModal: boolean;
    selectedServiceId: string | null;
    statistics: AgencyStatistics | null;
    statisticsLoading: boolean;
    pricing: PricingState;
    sapIntegration: SapIntegrationState;
  };
}

/**
 * Custom hook para gestionar servicios de Agency
 * Proporciona acceso completo al estado y acciones de Redux
 */
export const useAgencyServices = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Selectors
  const services = useSelector((state: AgencyServicesState) => state.agencyServices.services);
  const currentService = useSelector((state: AgencyServicesState) => state.agencyServices.currentService);
  const totalPages = useSelector((state: AgencyServicesState) => state.agencyServices.totalPages);
  const currentPage = useSelector((state: AgencyServicesState) => state.agencyServices.currentPage);
  const totalServices = useSelector((state: AgencyServicesState) => state.agencyServices.totalServices);
  const filters = useSelector((state: AgencyServicesState) => state.agencyServices.filters);
  const loading = useSelector((state: AgencyServicesState) => state.agencyServices.loading);
  const error = useSelector((state: AgencyServicesState) => state.agencyServices.error);
  const isCreating = useSelector((state: AgencyServicesState) => state.agencyServices.isCreating);
  const isUpdating = useSelector((state: AgencyServicesState) => state.agencyServices.isUpdating);
  const showViewModal = useSelector((state: AgencyServicesState) => state.agencyServices.showViewModal);
  const showEditModal = useSelector((state: AgencyServicesState) => state.agencyServices.showEditModal);
  const showStatusModal = useSelector((state: AgencyServicesState) => state.agencyServices.showStatusModal);
  const selectedServiceId = useSelector((state: AgencyServicesState) => state.agencyServices.selectedServiceId);
  const statistics = useSelector((state: AgencyServicesState) => state.agencyServices.statistics);
  const statisticsLoading = useSelector((state: AgencyServicesState) => state.agencyServices.statisticsLoading);
  
  // Pricing Selectors
  const pricing = useSelector((state: AgencyServicesState) => state.agencyServices.pricing);
  const pricingLoading = useSelector((state: AgencyServicesState) => state.agencyServices.pricing.isCalculating);
  const pricingError = useSelector((state: AgencyServicesState) => state.agencyServices.pricing.error);
  const currentPrice = useSelector((state: AgencyServicesState) => state.agencyServices.pricing.currentPrice);
  const priceBreakdown = useSelector((state: AgencyServicesState) => state.agencyServices.pricing.priceBreakdown);
  const routeFound = useSelector((state: AgencyServicesState) => state.agencyServices.pricing.routeFound);
  
  // SAP Selectors
  const sapIntegration = useSelector((state: AgencyServicesState) => state.agencyServices.sapIntegration);
  const sapLoading = useSelector((state: AgencyServicesState) => state.agencyServices.sapIntegration.sapLoading);
  const sapError = useSelector((state: AgencyServicesState) => state.agencyServices.sapIntegration.sapError);
  const xmlGenerated = useSelector((state: AgencyServicesState) => state.agencyServices.sapIntegration.xmlGenerated);
  const xmlContent = useSelector((state: AgencyServicesState) => state.agencyServices.sapIntegration.xmlContent);
  const xmlFileName = useSelector((state: AgencyServicesState) => state.agencyServices.sapIntegration.fileName);
  const readyForInvoice = useSelector((state: AgencyServicesState) => state.agencyServices.sapIntegration.readyForInvoice);
  const lastInvoiceNumber = useSelector((state: AgencyServicesState) => state.agencyServices.sapIntegration.lastInvoiceNumber);
  
  // Action creators
  const actions = useMemo(() => ({
    // Async actions
    fetchServices: (params?: FetchServicesParams) => dispatch(fetchAgencyServices(params)),
    createService: (serviceData: AgencyServiceInput) => dispatch(createAgencyService(serviceData)),
    updateService: (params: UpdateServiceParams) => dispatch(updateAgencyService(params)),
    updateStatus: (params: UpdateStatusParams) => dispatch(updateServiceStatus(params)),
    deleteService: (id: string) => dispatch(deleteAgencyService(id)),
    fetchServiceById: (id: string) => dispatch(fetchServiceById(id)),
    fetchStatistics: (params?: { startDate?: string; endDate?: string; clientId?: string }) => 
      dispatch(fetchAgencyStatistics(params)),
    
    // Sync actions
    setFilters: (filters: AgencyServiceFilters) => dispatch(setFilters(filters)),
    clearFilters: () => dispatch(clearFilters()),
    setPagination: (pagination: { page: number; totalPages: number; totalServices: number }) => 
      dispatch(setPagination(pagination)),
    setLoading: (loading: boolean) => dispatch(setLoading(loading)),
    setError: (error: string | null) => dispatch(setError(error)),
    clearError: () => dispatch(clearError()),
    setIsCreating: (isCreating: boolean) => dispatch(setIsCreating(isCreating)),
    setIsUpdating: (isUpdating: boolean) => dispatch(setIsUpdating(isUpdating)),
    
    // Modal actions
    openViewModal: (serviceId: string) => dispatch(openViewModal(serviceId)),
    openEditModal: (serviceId: string) => dispatch(openEditModal(serviceId)),
    openStatusModal: (serviceId: string) => dispatch(openStatusModal(serviceId)),
    closeModals: () => dispatch(closeModals()),
    
    // Service selection actions
    setSelectedService: (serviceId: string | null) => dispatch(setSelectedService(serviceId)),
    setCurrentService: (service: AgencyService | null) => dispatch(setCurrentService(service)),
    clearCurrentService: () => dispatch(clearCurrentService()),
    
    // ========== PRICING ACTIONS ==========
    
    // Pricing async actions
    calculateServicePrice: (priceData: PriceCalculationRequest) => dispatch(calculateServicePrice(priceData)),
    
    // Pricing sync actions
    clearPricingState: () => dispatch(clearPricingState()),
    setPricingLoading: (loading: boolean) => dispatch(setPricingLoading(loading)),
    setPricingError: (error: string | null) => dispatch(setPricingError(error)),
    
    // ========== SAP ACTIONS ==========
    
    // SAP Async actions
    fetchServicesReadyForInvoice: (filters?: {
      clientId?: string;
      startDate?: string;
      endDate?: string;
      vessel?: string;
      pickupLocation?: string;
    }) => dispatch(fetchServicesReadyForInvoice(filters || {})),
    
    generateSapXml: (invoiceData: SapXmlGenerationRequest) => dispatch(generateSapXml(invoiceData)),
    downloadSapXml: (fileName: string) => dispatch(downloadSapXml(fileName)),
    fetchSapXmlHistory: (params?: { page?: number; limit?: number }) => dispatch(fetchSapXmlHistory(params || {})),
    
    // SAP Sync actions
    clearSapState: () => dispatch(clearSapState()),
    setSapLoading: (loading: boolean) => dispatch(setSapLoading(loading)),
    setSapError: (error: string | null) => dispatch(setSapError(error)),
    setReadyForInvoice: (services: AgencyService[]) => dispatch(setReadyForInvoice(services)),
    setSapXmlGenerated: (data: {
      fileName: string;
      xmlContent: string;
      totalAmount: number;
      invoiceNumber: string;
    }) => dispatch(setSapXmlGenerated(data)),
  }), [dispatch]);
  
  // Helper functions
  const helpers = useMemo(() => ({
    // Obtener servicio por ID
    getServiceById: (id: string): AgencyService | undefined => {
      return services.find(service => service._id === id);
    },
    
    // Obtener servicio seleccionado actualmente
    getSelectedService: (): AgencyService | undefined => {
      if (!selectedServiceId) return undefined;
      return services.find(service => service._id === selectedServiceId);
    },
    
    // Verificar si un servicio puede ser editado
    canEditService: (service: AgencyService): boolean => {
      return ['pending', 'in_progress'].includes(service.status);
    },
    
    // Verificar si un servicio puede cambiar de estado
    canChangeStatus: (service: AgencyService, newStatus: string): boolean => {
      const validTransitions: Record<string, string[]> = {
        'pending': ['in_progress'],
        'in_progress': ['completed'],
        'completed': ['prefacturado'],
        'prefacturado': ['facturado'],
        'facturado': []
      };
      
      return validTransitions[service.status]?.includes(newStatus) || false;
    },
    
    // Filtrar servicios por estado
    getServicesByStatus: (status: string): AgencyService[] => {
      return services.filter(service => service.status === status);
    },
    
    // Obtener servicios de un cliente específico
    getServicesByClient: (clientId: string): AgencyService[] => {
      return services.filter(service => 
        typeof service.clientId === 'string' 
          ? service.clientId === clientId 
          : service.clientId._id === clientId
      );
    },
    
    // Obtener servicios por rango de fechas
    getServicesByDateRange: (startDate: string, endDate: string): AgencyService[] => {
      return services.filter(service => {
        const serviceDate = new Date(service.serviceDate);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return serviceDate >= start && serviceDate <= end;
      });
    },
    
    // Calcular estadísticas rápidas
    getQuickStats: () => {
      const stats = {
        total: services.length,
        pending: 0,
        inProgress: 0,
        completed: 0,
        invoiced: 0,
        totalValue: 0,
      };
      
      services.forEach(service => {
        // Skip if service is undefined or null
        if (!service) return;
        
        switch (service.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'in_progress':
            stats.inProgress++;
            break;
          case 'completed':
            stats.completed++;
            break;
          case 'facturado':
            stats.invoiced++;
            break;
        }
        
        if (service.price) {
          stats.totalValue += service.price;
        }
      });
      
      return stats;
    },
    
    // Verificar si hay filtros activos
    hasActiveFilters: (): boolean => {
      return Object.keys(filters).some(key => {
        const value = filters[key as keyof AgencyServiceFilters];
        return value !== undefined && value !== null && value !== '';
      });
    },
    
    // Formatear estado para mostrar
    formatStatus: (status: string): string => {
      const statusLabels: Record<string, string> = {
        'pending': 'Pendiente',
        'in_progress': 'En Progreso',
        'completed': 'Completado',
        'prefacturado': 'Pre-facturado',
        'facturado': 'Facturado'
      };
      
      return statusLabels[status] || status;
    },
    
    // Obtener color para el estado
    getStatusColor: (status: string): string => {
      const statusColors: Record<string, string> = {
        'pending': 'yellow',
        'in_progress': 'blue',
        'completed': 'green',
        'prefacturado': 'orange',
        'facturado': 'purple'
      };
      
      return statusColors[status] || 'gray';
    },
  }), [services, selectedServiceId, filters]);
  
  // Computed values
  const computed = useMemo(() => ({
    // Estado general de carga
    isLoading: loading || isCreating || isUpdating || statisticsLoading,
    
    // Información de paginación
    pagination: {
      currentPage,
      totalPages,
      totalServices,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    },
    
    // Estado de modales
    modals: {
      showViewModal,
      showEditModal,
      showStatusModal,
      selectedServiceId,
    },
    
    // Estadísticas rápidas
    quickStats: helpers.getQuickStats(),
    
    // Servicio seleccionado
    selectedService: helpers.getSelectedService(),
  }), [
    loading,
    isCreating,
    isUpdating,
    statisticsLoading,
    currentPage,
    totalPages,
    totalServices,
    showViewModal,
    showEditModal,
    showStatusModal,
    selectedServiceId,
    helpers
  ]);
  
  return {
    // State
    services,
    currentService,
    totalPages,
    currentPage,
    totalServices,
    filters,
    loading,
    error,
    isCreating,
    isUpdating,
    statistics,
    statisticsLoading,
    
    // Pricing State
    pricing,
    pricingLoading,
    pricingError,
    currentPrice,
    priceBreakdown,
    routeFound,
    
    // SAP State
    sapIntegration,
    sapLoading,
    sapError,
    xmlGenerated,
    xmlContent,
    xmlFileName,
    readyForInvoice,
    lastInvoiceNumber,
    
    // Actions
    ...actions,
    
    // Helpers
    ...helpers,
    
    // Computed
    ...computed,
  };
};

/**
 * Hook simplificado para casos básicos
 */
export const useAgencyServicesBasic = () => {
  const { 
    services, 
    loading, 
    error, 
    fetchServices, 
    createService, 
    updateService,
    deleteService
  } = useAgencyServices();
  
  return {
    services,
    loading,
    error,
    fetchServices,
    createService,
    updateService,
    deleteService,
  };
};

/**
 * Hook específico para estadísticas
 */
export const useAgencyServicesStatistics = () => {
  const { 
    statistics, 
    statisticsLoading, 
    fetchStatistics, 
    quickStats 
  } = useAgencyServices();
  
  return {
    statistics,
    loading: statisticsLoading,
    fetchStatistics,
    quickStats,
  };
};

/**
 * Hook específico para modales
 */
export const useAgencyServicesModals = () => {
  const {
    showViewModal,
    showEditModal,
    showStatusModal,
    selectedServiceId,
    selectedService,
    openViewModal,
    openEditModal,
    openStatusModal,
    closeModals,
  } = useAgencyServices();
  
  return {
    modals: {
      showViewModal,
      showEditModal,
      showStatusModal,
    },
    selectedServiceId,
    selectedService,
    actions: {
      openViewModal,
      openEditModal,
      openStatusModal,
      closeModals,
    },
  };
};

export default useAgencyServices;