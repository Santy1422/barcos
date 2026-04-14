import { useSelector, useDispatch } from 'react-redux';
import { useMemo } from 'react';
import type { AppDispatch } from '@/lib/store';
import {
  fetchAgencyVehicleTypes,
  createAgencyVehicleType,
  updateAgencyVehicleType,
  deleteAgencyVehicleType,
  clearError,
  type AgencyVehicleType,
  type AgencyVehicleTypeInput,
} from './agencyVehicleTypesSlice';

interface RootVehicleTypes {
  agencyVehicleTypes: {
    vehicleTypes: AgencyVehicleType[];
    loading: boolean;
    error: string | null;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
  };
}

export function useAgencyVehicleTypes() {
  const dispatch = useDispatch<AppDispatch>();
  const vehicleTypes = useSelector((s: RootVehicleTypes) => s.agencyVehicleTypes.vehicleTypes);
  const loading = useSelector((s: RootVehicleTypes) => s.agencyVehicleTypes.loading);
  const error = useSelector((s: RootVehicleTypes) => s.agencyVehicleTypes.error);
  const isCreating = useSelector((s: RootVehicleTypes) => s.agencyVehicleTypes.isCreating);
  const isUpdating = useSelector((s: RootVehicleTypes) => s.agencyVehicleTypes.isUpdating);
  const isDeleting = useSelector((s: RootVehicleTypes) => s.agencyVehicleTypes.isDeleting);

  const actions = useMemo(
    () => ({
      fetchVehicleTypes: () => dispatch(fetchAgencyVehicleTypes()),
      createVehicleType: (input: AgencyVehicleTypeInput) => dispatch(createAgencyVehicleType(input)),
      updateVehicleType: (id: string, updateData: Partial<AgencyVehicleTypeInput>) =>
        dispatch(updateAgencyVehicleType({ id, updateData })),
      deleteVehicleType: (id: string) => dispatch(deleteAgencyVehicleType(id)),
      clearError: () => dispatch(clearError()),
    }),
    [dispatch]
  );

  return {
    vehicleTypes,
    loading,
    error,
    isCreating,
    isUpdating,
    isDeleting,
    ...actions,
  };
}
