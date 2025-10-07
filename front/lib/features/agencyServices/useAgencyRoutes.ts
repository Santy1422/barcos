import { useSelector, useDispatch } from 'react-redux';
import { useMemo } from 'react';
import { AppDispatch } from '../../store';
import {
  fetchAgencyRoutes,
  fetchActiveRoutes,
  fetchRouteById,
  createAgencyRoute,
  updateAgencyRoute,
  deactivateAgencyRoute,
  reactivateAgencyRoute,
  deleteAgencyRoute,
  calculateRoutePrice,
  fetchRouteStatistics,
  setFilters,
  clearFilters,
  setError,
  clearError,
  openViewModal,
  openEditModal,
  openCreateModal,
  closeModals,
  setCurrentRoute,
  clearCurrentRoute,
  clearPriceCalculation,
  type AgencyRoute,
  type AgencyRouteInput,
  type RouteFilters,
  type FetchRoutesParams,
  type UpdateRouteParams,
  type CalculatePriceParams,
  type RouteStatistics,
  type PriceCalculationResult,
} from './agencyRoutesSlice';

interface AgencyRoutesState {
  agencyRoutes: {
    routes: AgencyRoute[];
    currentRoute: AgencyRoute | null;
    filters: RouteFilters;
    totalRoutes: number;
    currentPage: number;
    totalPages: number;
    loading: boolean;
    error: string | null;
    isCreating: boolean;
    isUpdating: boolean;
    showViewModal: boolean;
    showEditModal: boolean;
    showCreateModal: boolean;
    selectedRouteId: string | null;
    statistics: RouteStatistics | null;
    statisticsLoading: boolean;
    priceCalculation: PriceCalculationResult | null;
    priceCalculationLoading: boolean;
  };
}

export const useAgencyRoutes = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Selectors
  const routes = useSelector((state: AgencyRoutesState) => state.agencyRoutes.routes);
  const currentRoute = useSelector((state: AgencyRoutesState) => state.agencyRoutes.currentRoute);
  const filters = useSelector((state: AgencyRoutesState) => state.agencyRoutes.filters);
  const totalRoutes = useSelector((state: AgencyRoutesState) => state.agencyRoutes.totalRoutes);
  const currentPage = useSelector((state: AgencyRoutesState) => state.agencyRoutes.currentPage);
  const totalPages = useSelector((state: AgencyRoutesState) => state.agencyRoutes.totalPages);
  const loading = useSelector((state: AgencyRoutesState) => state.agencyRoutes.loading);
  const error = useSelector((state: AgencyRoutesState) => state.agencyRoutes.error);
  const isCreating = useSelector((state: AgencyRoutesState) => state.agencyRoutes.isCreating);
  const isUpdating = useSelector((state: AgencyRoutesState) => state.agencyRoutes.isUpdating);
  const showViewModal = useSelector((state: AgencyRoutesState) => state.agencyRoutes.showViewModal);
  const showEditModal = useSelector((state: AgencyRoutesState) => state.agencyRoutes.showEditModal);
  const showCreateModal = useSelector((state: AgencyRoutesState) => state.agencyRoutes.showCreateModal);
  const selectedRouteId = useSelector((state: AgencyRoutesState) => state.agencyRoutes.selectedRouteId);
  const statistics = useSelector((state: AgencyRoutesState) => state.agencyRoutes.statistics);
  const statisticsLoading = useSelector((state: AgencyRoutesState) => state.agencyRoutes.statisticsLoading);
  const priceCalculation = useSelector((state: AgencyRoutesState) => state.agencyRoutes.priceCalculation);
  const priceCalculationLoading = useSelector((state: AgencyRoutesState) => state.agencyRoutes.priceCalculationLoading);
  
  // Action creators
  const actions = useMemo(() => ({
    fetchRoutes: (params?: FetchRoutesParams) => dispatch(fetchAgencyRoutes(params)),
    fetchActiveRoutes: () => dispatch(fetchActiveRoutes()),
    fetchRouteById: (id: string) => dispatch(fetchRouteById(id)),
    createRoute: (routeData: AgencyRouteInput) => dispatch(createAgencyRoute(routeData)),
    updateRoute: (params: UpdateRouteParams) => dispatch(updateAgencyRoute(params)),
    deactivateRoute: (id: string) => dispatch(deactivateAgencyRoute(id)),
    reactivateRoute: (id: string) => dispatch(reactivateAgencyRoute(id)),
    deleteRoute: (id: string) => dispatch(deleteAgencyRoute(id)),
    calculatePrice: (params: CalculatePriceParams) => dispatch(calculateRoutePrice(params)),
    fetchStatistics: () => dispatch(fetchRouteStatistics()),
    setFilters: (filters: RouteFilters) => dispatch(setFilters(filters)),
    clearFilters: () => dispatch(clearFilters()),
    setError: (error: string | null) => dispatch(setError(error)),
    clearError: () => dispatch(clearError()),
    openViewModal: (routeId: string) => dispatch(openViewModal(routeId)),
    openEditModal: (routeId: string) => dispatch(openEditModal(routeId)),
    openCreateModal: () => dispatch(openCreateModal()),
    closeModals: () => dispatch(closeModals()),
    setCurrentRoute: (route: AgencyRoute | null) => dispatch(setCurrentRoute(route)),
    clearCurrentRoute: () => dispatch(clearCurrentRoute()),
    clearPriceCalculation: () => dispatch(clearPriceCalculation()),
  }), [dispatch]);
  
  // Helper functions
  const helpers = useMemo(() => ({
    getRouteById: (id: string): AgencyRoute | undefined => {
      return routes.find(route => route._id === id);
    },
    
    getSelectedRoute: (): AgencyRoute | undefined => {
      if (!selectedRouteId) return undefined;
      return routes.find(route => route._id === selectedRouteId);
    },
    
    getActiveRoutes: (): AgencyRoute[] => {
      return routes.filter(route => route.isActive);
    },
    
    getRoutesByLocation: (location: string): AgencyRoute[] => {
      const normalizedLocation = location.toUpperCase();
      return routes.filter(route => 
        route.pickupLocation.toUpperCase() === normalizedLocation ||
        route.dropoffLocation.toUpperCase() === normalizedLocation
      );
    },
    
    findRouteByLocations: (pickupLocation: string, dropoffLocation: string): AgencyRoute | undefined => {
      const normalizedPickup = pickupLocation.toUpperCase();
      const normalizedDropoff = dropoffLocation.toUpperCase();
      return routes.find(route => {
        // Buscar por site types (método nuevo)
        const matchesSiteTypes = route.pickupSiteType?.toUpperCase() === normalizedPickup &&
                                 route.dropoffSiteType?.toUpperCase() === normalizedDropoff;
        
        // Buscar por locations (método legacy para compatibilidad)
        const matchesLocations = route.pickupLocation?.toUpperCase() === normalizedPickup &&
                                 route.dropoffLocation?.toUpperCase() === normalizedDropoff;
        
        return (matchesSiteTypes || matchesLocations) && route.isActive;
      });
    },
    
    getPriceForRoute: (
      route: AgencyRoute,
      routeType: 'single' | 'roundtrip',
      passengerCount: number
    ): number | null => {
      const pricingConfig = route.pricing.find(p => p.routeType === routeType);
      if (!pricingConfig) return null;
      
      const priceRange = pricingConfig.passengerRanges.find(range =>
        passengerCount >= range.minPassengers && passengerCount <= range.maxPassengers
      );
      
      return priceRange ? priceRange.price : null;
    },
    
    hasActiveFilters: (): boolean => {
      return Object.keys(filters).some(key => {
        const value = filters[key as keyof RouteFilters];
        return value !== undefined && value !== null && value !== '';
      });
    },
  }), [routes, selectedRouteId, filters]);
  
  // Computed values
  const computed = useMemo(() => ({
    isLoading: loading || isCreating || isUpdating || statisticsLoading,
    
    modals: {
      showViewModal,
      showEditModal,
      showCreateModal,
      selectedRouteId,
    },
    
    selectedRoute: helpers.getSelectedRoute(),
    
    activeRoutesCount: routes.filter(r => r.isActive).length,
    inactiveRoutesCount: routes.filter(r => !r.isActive).length,
    
    hasPriceCalculation: priceCalculation !== null && priceCalculation.found,
    calculatedPrice: priceCalculation?.price || null,
    priceBreakdown: priceCalculation?.breakdown || null,
  }), [
    loading,
    isCreating,
    isUpdating,
    statisticsLoading,
    showViewModal,
    showEditModal,
    showCreateModal,
    selectedRouteId,
    routes,
    priceCalculation,
    helpers
  ]);
  
  return {
    // State
    routes,
    currentRoute,
    filters,
    totalRoutes,
    currentPage,
    totalPages,
    loading,
    error,
    isCreating,
    isUpdating,
    statistics,
    statisticsLoading,
    priceCalculation,
    priceCalculationLoading,
    
    // Actions
    ...actions,
    
    // Helpers
    ...helpers,
    
    // Computed
    ...computed,
  };
};

export default useAgencyRoutes;

