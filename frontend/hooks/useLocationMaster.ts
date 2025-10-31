'use client';

import { useState, useEffect, useMemo } from 'react';
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

  const loadLocations = async (locationType?: LocationType) => {
    try {
      setLoading(true);
      const response = await locationMasterAPI.getActive({ locationType });
      setLocations(response.data.locationMasters || []);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const createLocation = async (data: CreateLocationMasterRequest): Promise<boolean> => {
    try {
      await locationMasterAPI.create(data);
      // Don't show success toast here - parent component will handle it
      await loadLocations();
      return true;
    } catch (error: any) {
      console.error('Error creating location:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create location';
      toast.error(errorMessage);
      return false;
    }
  };

  const updateLocation = async (id: string, data: UpdateLocationMasterRequest): Promise<boolean> => {
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
  };

  const deleteLocation = async (id: string): Promise<boolean> => {
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
  };

  const toggleLocationStatus = async (location: LocationMaster): Promise<boolean> => {
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
  };

  // Get locations by type
  const getLocationsByType = (type: LocationType) => {
    return locations.filter(loc => loc.locationType === type && loc.isActive);
  };

  useEffect(() => {
    loadLocations();
  }, []);

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
