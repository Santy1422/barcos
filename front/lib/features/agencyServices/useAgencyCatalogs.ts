import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { AppDispatch } from '../../store';
import {
  // Actions
  fetchAgencyCatalogs,
  fetchGroupedCatalogs,
  createAgencyCatalog,
  updateAgencyCatalog,
  deactivateAgencyCatalog,
  reactivateAgencyCatalog,
  fetchCatalogById,
  searchCatalogs,
  fetchCatalogStatistics,
  setFilters,
  clearFilters,
  setLoading,
  setError,
  clearError,
  setIsCreating,
  setIsUpdating,
  openViewModal,
  openEditModal,
  openCreateModal,
  closeModals,
  setSelectedCatalog,
  setSelectedCatalogType,
  setCurrentCatalog,
  clearCurrentCatalog,
  
  // Types
  type AgencyCatalog,
  type AgencyCatalogInput,
  type CatalogType,
  type CatalogFilters,
  type FetchCatalogsParams,
  type UpdateCatalogParams,
  type GroupedCatalogs,
  type CatalogStatistics,
  
  // Selectors
  selectActiveCatalogsByType,
  selectActiveLocations,
  selectActiveNationalities,
  selectActiveRanks,
  selectActiveVessels,
  selectActiveTransportCompanies,
  selectActiveDrivers,
  selectActiveTauliaCodes,
  selectCatalogByTypeAndName,
} from './agencyCatalogsSlice';

// State type for selector
interface AgencyCatalogsState {
  agencyCatalogs: {
    catalogs: AgencyCatalog[];
    groupedCatalogs: GroupedCatalogs | null;
    currentCatalog: AgencyCatalog | null;
    filters: CatalogFilters;
    totalCatalogs: number;
    loading: boolean;
    error: string | null;
    isCreating: boolean;
    isUpdating: boolean;
    showViewModal: boolean;
    showEditModal: boolean;
    showCreateModal: boolean;
    selectedCatalogId: string | null;
    selectedCatalogType: CatalogType | null;
    statistics: CatalogStatistics | null;
    statisticsLoading: boolean;
  };
}

/**
 * Custom hook para gestionar catálogos de Agency
 * Proporciona acceso completo al estado y acciones de Redux
 */
export const useAgencyCatalogs = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Selectors
  const catalogs = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.catalogs);
  const groupedCatalogs = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.groupedCatalogs);
  const currentCatalog = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.currentCatalog);
  const filters = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.filters);
  const totalCatalogs = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.totalCatalogs);
  const loading = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.loading);
  const error = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.error);
  const isCreating = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.isCreating);
  const isUpdating = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.isUpdating);
  const showViewModal = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.showViewModal);
  const showEditModal = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.showEditModal);
  const showCreateModal = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.showCreateModal);
  const selectedCatalogId = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.selectedCatalogId);
  const selectedCatalogType = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.selectedCatalogType);
  const statistics = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.statistics);
  const statisticsLoading = useSelector((state: AgencyCatalogsState) => state.agencyCatalogs.statisticsLoading);
  
  // Specific catalog selectors
  const locations = useSelector(selectActiveLocations);
  const nationalities = useSelector(selectActiveNationalities);
  const ranks = useSelector(selectActiveRanks);
  const vessels = useSelector(selectActiveVessels);
  const transportCompanies = useSelector(selectActiveTransportCompanies);
  const drivers = useSelector(selectActiveDrivers);
  const tauliaCodes = useSelector(selectActiveTauliaCodes);
  
  // Action creators
  const actions = useMemo(() => ({
    // Async actions
    fetchCatalogs: (params?: FetchCatalogsParams) => dispatch(fetchAgencyCatalogs(params)),
    fetchGroupedCatalogs: () => dispatch(fetchGroupedCatalogs()),
    createCatalog: (catalogData: AgencyCatalogInput) => dispatch(createAgencyCatalog(catalogData)),
    updateCatalog: (params: UpdateCatalogParams) => dispatch(updateAgencyCatalog(params)),
    deactivateCatalog: (id: string) => dispatch(deactivateAgencyCatalog(id)),
    reactivateCatalog: (id: string) => dispatch(reactivateAgencyCatalog(id)),
    fetchCatalogById: (id: string) => dispatch(fetchCatalogById(id)),
    searchCatalogs: (searchTerm: string) => dispatch(searchCatalogs(searchTerm)),
    fetchStatistics: () => dispatch(fetchCatalogStatistics()),
    
    // Sync actions
    setFilters: (filters: CatalogFilters) => dispatch(setFilters(filters)),
    clearFilters: () => dispatch(clearFilters()),
    setLoading: (loading: boolean) => dispatch(setLoading(loading)),
    setError: (error: string | null) => dispatch(setError(error)),
    clearError: () => dispatch(clearError()),
    setIsCreating: (isCreating: boolean) => dispatch(setIsCreating(isCreating)),
    setIsUpdating: (isUpdating: boolean) => dispatch(setIsUpdating(isUpdating)),
    
    // Modal actions
    openViewModal: (catalogId: string) => dispatch(openViewModal(catalogId)),
    openEditModal: (catalogId: string) => dispatch(openEditModal(catalogId)),
    openCreateModal: (catalogType: CatalogType) => dispatch(openCreateModal(catalogType)),
    closeModals: () => dispatch(closeModals()),
    
    // Selection actions
    setSelectedCatalog: (catalogId: string | null) => dispatch(setSelectedCatalog(catalogId)),
    setSelectedCatalogType: (catalogType: CatalogType | null) => dispatch(setSelectedCatalogType(catalogType)),
    setCurrentCatalog: (catalog: AgencyCatalog | null) => dispatch(setCurrentCatalog(catalog)),
    clearCurrentCatalog: () => dispatch(clearCurrentCatalog()),
  }), [dispatch]);
  
  // Helper functions
  const helpers = useMemo(() => ({
    // Obtener catálogo por ID
    getCatalogById: (id: string): AgencyCatalog | undefined => {
      return catalogs.find(catalog => catalog._id === id);
    },
    
    // Obtener catálogo seleccionado actualmente
    getSelectedCatalog: (): AgencyCatalog | undefined => {
      if (!selectedCatalogId) return undefined;
      return catalogs.find(catalog => catalog._id === selectedCatalogId);
    },
    
    // Obtener catálogos por tipo
    getCatalogsByType: (type: CatalogType, activeOnly = true): AgencyCatalog[] => {
      return catalogs.filter(catalog => 
        catalog.type === type && (!activeOnly || catalog.isActive)
      );
    },
    
    // Buscar catálogo por tipo y nombre
    findCatalogByName: (type: CatalogType, name: string): AgencyCatalog | undefined => {
      const normalizedName = name.trim().toLowerCase();
      return catalogs.find(catalog => 
        catalog.type === type && 
        catalog.name.toLowerCase() === normalizedName &&
        catalog.isActive
      );
    },
    
    // Obtener opciones para select/dropdown
    getOptionsForType: (type: CatalogType): Array<{value: string; label: string; metadata?: any}> => {
      const catalogsOfType = helpers.getCatalogsByType(type, true);
      return catalogsOfType.map(catalog => ({
        value: catalog._id,
        label: catalog.displayName || catalog.name,
        metadata: catalog.metadata,
      }));
    },
    
    // Verificar si un catálogo puede ser eliminado
    canDeactivateCatalog: (catalog: AgencyCatalog): boolean => {
      return catalog.isActive;
    },
    
    // Verificar si un catálogo puede ser reactivado
    canReactivateCatalog: (catalog: AgencyCatalog): boolean => {
      return !catalog.isActive;
    },
    
    // Obtener etiqueta del tipo de catálogo
    getTypeLabel: (type: CatalogType): string => {
      const typeLabels: Record<CatalogType, string> = {
        'location': 'Ubicación',
        'nationality': 'Nacionalidad',
        'rank': 'Rango',
        'vessel': 'Buque',
        'transport_company': 'Empresa de Transporte',
        'driver': 'Conductor',
        'taulia_code': 'Código Taulia'
      };
      return typeLabels[type] || type;
    },
    
    // Obtener icono para el tipo de catálogo
    getTypeIcon: (type: CatalogType): string => {
      const typeIcons: Record<CatalogType, string> = {
        'location': '📍',
        'nationality': '🌍',
        'rank': '⚓',
        'vessel': '🚢',
        'transport_company': '🚐',
        'driver': '🚗',
        'taulia_code': '💳'
      };
      return typeIcons[type] || '📋';
    },
    
    // Verificar si hay filtros activos
    hasActiveFilters: (): boolean => {
      return Object.keys(filters).some(key => {
        const value = filters[key as keyof CatalogFilters];
        return value !== undefined && value !== null && value !== '';
      });
    },
    
    // Obtener estadísticas rápidas por tipo
    getQuickStatsByType: () => {
      const stats: Record<CatalogType, { total: number; active: number; inactive: number }> = {
        location: { total: 0, active: 0, inactive: 0 },
        nationality: { total: 0, active: 0, inactive: 0 },
        rank: { total: 0, active: 0, inactive: 0 },
        vessel: { total: 0, active: 0, inactive: 0 },
        transport_company: { total: 0, active: 0, inactive: 0 },
        driver: { total: 0, active: 0, inactive: 0 },
        taulia_code: { total: 0, active: 0, inactive: 0 },
      };
      
      catalogs.forEach(catalog => {
        stats[catalog.type].total++;
        if (catalog.isActive) {
          stats[catalog.type].active++;
        } else {
          stats[catalog.type].inactive++;
        }
      });
      
      return stats;
    },
    
    // Validar datos del catálogo según el tipo
    validateCatalogData: (type: CatalogType, data: Partial<AgencyCatalogInput>): string[] => {
      const errors: string[] = [];
      
      if (!data.name?.trim()) {
        errors.push('El nombre es requerido');
      }
      
      // Validaciones específicas por tipo
      switch (type) {
        case 'taulia_code':
          if (!data.code?.trim()) {
            errors.push('El código es requerido para códigos Taulia');
          }
          if (data.metadata?.price !== undefined && typeof data.metadata.price !== 'number') {
            errors.push('El precio debe ser un número');
          }
          break;
        case 'driver':
          if (data.metadata?.phone && typeof data.metadata.phone !== 'string') {
            errors.push('El teléfono debe ser un texto');
          }
          break;
        case 'location':
          if (data.metadata?.siteType && typeof data.metadata.siteType !== 'string') {
            errors.push('El tipo de sitio debe ser un texto');
          }
          break;
      }
      
      return errors;
    },
  }), [catalogs, selectedCatalogId, filters]);
  
  // Computed values
  const computed = useMemo(() => ({
    // Estado general de carga
    isLoading: loading || isCreating || isUpdating || statisticsLoading,
    
    // Estado de modales
    modals: {
      showViewModal,
      showEditModal,
      showCreateModal,
      selectedCatalogId,
      selectedCatalogType,
    },
    
    // Estadísticas rápidas
    quickStats: helpers.getQuickStatsByType(),
    
    // Catálogo seleccionado
    selectedCatalog: helpers.getSelectedCatalog(),
    
    // Verificar si los datos están cargados
    isDataLoaded: catalogs.length > 0 || groupedCatalogs !== null,
    
    // Contar catálogos activos e inactivos
    activeCatalogsCount: catalogs.filter(c => c.isActive).length,
    inactiveCatalogsCount: catalogs.filter(c => !c.isActive).length,
  }), [
    loading,
    isCreating,
    isUpdating,
    statisticsLoading,
    showViewModal,
    showEditModal,
    showCreateModal,
    selectedCatalogId,
    selectedCatalogType,
    catalogs,
    groupedCatalogs,
    helpers
  ]);
  
  return {
    // State
    catalogs,
    groupedCatalogs,
    currentCatalog,
    filters,
    totalCatalogs,
    loading,
    error,
    isCreating,
    isUpdating,
    statistics,
    statisticsLoading,
    
    // Specific catalog types
    locations,
    nationalities,
    ranks,
    vessels,
    transportCompanies,
    drivers,
    tauliaCodes,
    
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
export const useAgencyCatalogsBasic = () => {
  const { 
    catalogs, 
    loading, 
    error, 
    fetchCatalogs, 
    createCatalog, 
    updateCatalog,
    deactivateCatalog
  } = useAgencyCatalogs();
  
  return {
    catalogs,
    loading,
    error,
    fetchCatalogs,
    createCatalog,
    updateCatalog,
    deactivateCatalog,
  };
};

/**
 * Hook específico para un tipo de catálogo
 */
export const useAgencyCatalogsByType = (type: CatalogType) => {
  const {
    getCatalogsByType,
    getOptionsForType,
    createCatalog,
    updateCatalog,
    loading,
    error,
  } = useAgencyCatalogs();
  
  const catalogsOfType = useMemo(() => getCatalogsByType(type), [getCatalogsByType, type]);
  const options = useMemo(() => getOptionsForType(type), [getOptionsForType, type]);
  
  return {
    catalogs: catalogsOfType,
    options,
    createCatalog: (data: Omit<AgencyCatalogInput, 'type'>) => 
      createCatalog({ ...data, type }),
    updateCatalog,
    loading,
    error,
  };
};

/**
 * Hook específico para ubicaciones
 */
export const useLocationsCatalog = () => useAgencyCatalogsByType('location');

/**
 * Hook específico para nacionalidades
 */
export const useNationalitiesCatalog = () => useAgencyCatalogsByType('nationality');

/**
 * Hook específico para rangos
 */
export const useRanksCatalog = () => useAgencyCatalogsByType('rank');

/**
 * Hook específico para buques
 */
export const useVesselsCatalog = () => useAgencyCatalogsByType('vessel');

/**
 * Hook específico para empresas de transporte
 */
export const useTransportCompaniesCatalog = () => useAgencyCatalogsByType('transport_company');

/**
 * Hook específico para conductores
 */
export const useDriversCatalog = () => useAgencyCatalogsByType('driver');

/**
 * Hook específico para códigos Taulia
 */
export const useTauliaCodesCatalog = () => useAgencyCatalogsByType('taulia_code');

/**
 * Hook específico para estadísticas
 */
export const useAgencyCatalogsStatistics = () => {
  const { 
    statistics, 
    statisticsLoading, 
    fetchStatistics, 
    quickStats 
  } = useAgencyCatalogs();
  
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
export const useAgencyCatalogsModals = () => {
  const {
    showViewModal,
    showEditModal,
    showCreateModal,
    selectedCatalogId,
    selectedCatalogType,
    selectedCatalog,
    openViewModal,
    openEditModal,
    openCreateModal,
    closeModals,
  } = useAgencyCatalogs();
  
  return {
    modals: {
      showViewModal,
      showEditModal,
      showCreateModal,
    },
    selectedCatalogId,
    selectedCatalogType,
    selectedCatalog,
    actions: {
      openViewModal,
      openEditModal,
      openCreateModal,
      closeModals,
    },
  };
};

export default useAgencyCatalogs;