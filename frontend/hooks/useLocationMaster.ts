'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { locationMasterAPI } from '@/lib/api';
import { LocationMaster, CreateLocationMasterRequest, UpdateLocationMasterRequest, LocationType } from '@/types';

export function useLocationMaster() {
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocationType, setFilterLocationType] = useState<LocationType | undefined>();

  const filteredLocations = useMemo(() => {
    let filtered = locations;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(location =>
        location.name.toLowerCase().includes(term) ||
        location.code.toLowerCase().includes(term) ||
        location.city.toLowerCase().includes(term)
      );
    }

    if (filterLocationType) {
      filtered = filtered.filter(location => location.locationType === filterLocationType);
    }

    return filtered;
  }, [locations, searchTerm, filterLocationType]);

  // Wrap loadLocations in useCallback to prevent infinite loops
  const loadLocations = useCallback(async (locationType?: LocationType) => {
    console.log('[useLocationMaster] loadLocations called', { locationType });
    try {
      setLoading(true);
      const response = await locationMasterAPI.getActive({ locationType });
      const locations = response.data.locationMasters || [];
      console.log('[useLocationMaster] Locations loaded:', locations.length);
      setLocations(locations);
    } catch (error) {
      console.error('[useLocationMaster] Error loading locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array - this function doesn't depend on any props or state

  // Wrap all functions that call loadLocations in useCallback to prevent recreating them
  const createLocation = useCallback(async (data: CreateLocationMasterRequest): Promise<boolean> => {
    console.log('[useLocationMaster] createLocation called', { data });
    try {
      const response = await locationMasterAPI.create(data);
      console.log('[useLocationMaster] Location created, response:', response);
      // Don't show success toast here - parent component will handle it
      console.log('[useLocationMaster] Reloading locations...');
      await loadLocations();
      console.log('[useLocationMaster] Locations reloaded');
      return true;
    } catch (error: any) {
      console.error('[useLocationMaster] Error creating location:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create location';
      toast.error(errorMessage);
      return false;
    }
  }, [loadLocations]);

  const updateLocation = useCallback(async (id: string, data: UpdateLocationMasterRequest): Promise<boolean> => {
    try {
      await locationMasterAPI.update(id, data);
      // Don't show success toast here - parent component will handle it
      await loadLocations();
      return true;
    } catch (error: any) {
      console.error('Error updating location:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update location';
      toast.error(errorMessage);
      return false;
    }
  }, [loadLocations]);

  const deleteLocation = useCallback(async (id: string): Promise<boolean> => {
    try {
      await locationMasterAPI.delete(id);
      // Don't show success toast here - parent component will handle it
      await loadLocations();
      return true;
    } catch (error: any) {
      console.error('Error deleting location:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete location';
      toast.error(errorMessage);
      return false;
    }
  }, [loadLocations]);

  const toggleLocationStatus = useCallback(async (location: LocationMaster): Promise<boolean> => {
    try {
      await locationMasterAPI.toggleStatus(location.id);
      // Don't show success toast here - parent component will handle it
      await loadLocations();
      return true;
    } catch (error: any) {
      console.error('Error toggling location status:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update location status';
      toast.error(errorMessage);
      return false;
    }
  }, [loadLocations]);

  // Get locations by type
  const getLocationsByType = (type: LocationType) => {
    return locations.filter(loc => loc.locationType === type && loc.isActive);
  };

  useEffect(() => {
    loadLocations();
  }, [loadLocations]); // Now loadLocations is stable due to useCallback

  return {
    locations,
    loading,
    searchTerm,
    setSearchTerm,
    filterLocationType,
    setFilterLocationType,
    filteredLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    toggleLocationStatus,
    loadLocations,
    getLocationsByType,
  };
}
