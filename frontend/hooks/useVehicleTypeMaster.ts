'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { vehicleTypeMasterAPI } from '@/lib/api';

interface VehicleTypeMaster {
  id: string;
  vehicleName: string;
  paxCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateVehicleTypeMasterRequest {
  vehicleName: string;
  paxCount: number;
  isActive?: boolean;
}

export function useVehicleTypeMaster() {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadVehicleTypes = async () => {
    try {
      setLoading(true);
      const response = await vehicleTypeMasterAPI.getAll({ limit: 1000 });
      console.log('VehicleTypeMaster API Response:', response);
      console.log('Response data:', response.data);
      
      // Backend returns: { success: true, data: { vehicleTypeMasters: [...] }, pagination: {...} }
      // Axios wraps it in response.data, so we need response.data.data.vehicleTypeMasters
      const vehicleTypes = response.data?.data?.vehicleTypeMasters || response.data?.vehicleTypeMasters || [];
      console.log('Extracted vehicleTypes:', vehicleTypes);
      
      // Ensure it's always an array
      const vehicleTypeArray = Array.isArray(vehicleTypes) ? vehicleTypes : [];
      console.log('Setting vehicleTypes array:', vehicleTypeArray);
      setVehicleTypes(vehicleTypeArray);
    } catch (error) {
      toast.error('Failed to load vehicle types');
      console.error('Error loading vehicle types:', error);
      setVehicleTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const createVehicleType = async (data: CreateVehicleTypeMasterRequest) => {
    try {
      await vehicleTypeMasterAPI.create(data);
      await loadVehicleTypes();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to create vehicle type';
      toast.error(errorMessage);
      console.error('Error creating vehicle type:', error);
      return false;
    }
  };

  const updateVehicleType = async (id: string, data: CreateVehicleTypeMasterRequest) => {
    try {
      await vehicleTypeMasterAPI.update(id, data);
      await loadVehicleTypes();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to update vehicle type';
      toast.error(errorMessage);
      console.error('Error updating vehicle type:', error);
      return false;
    }
  };

  const deleteVehicleType = async (id: string) => {
    try {
      await vehicleTypeMasterAPI.delete(id);
      await loadVehicleTypes();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to delete vehicle type';
      toast.error(errorMessage);
      console.error('Error deleting vehicle type:', error);
      return false;
    }
  };

  const toggleVehicleTypeStatus = async (id: string) => {
    try {
      await vehicleTypeMasterAPI.toggleStatus(id);
      await loadVehicleTypes();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to toggle vehicle type status';
      toast.error(errorMessage);
      console.error('Error toggling vehicle type status:', error);
      return false;
    }
  };

  const filteredVehicleTypes = useMemo(() => {
    if (!Array.isArray(vehicleTypes)) {
      return [];
    }
    if (!searchTerm) {
      return vehicleTypes;
    }
    const term = searchTerm.toLowerCase();
    return vehicleTypes.filter(vehicleType =>
      vehicleType.vehicleName.toLowerCase().includes(term) ||
      vehicleType.paxCount.toString().includes(term)
    );
  }, [vehicleTypes, searchTerm]);

  useEffect(() => {
    loadVehicleTypes();
  }, []);

  return {
    vehicleTypes,
    loading,
    searchTerm,
    setSearchTerm,
    filteredVehicleTypes,
    createVehicleType,
    updateVehicleType,
    deleteVehicleType,
    toggleVehicleTypeStatus,
    loadVehicleTypes
  };
}

