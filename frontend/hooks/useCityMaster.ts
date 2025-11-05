'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { cityMasterAPI } from '@/lib/api';
import { CityMaster, CreateCityMasterRequest, UpdateCityMasterRequest } from '@/types';

export function useCityMaster() {
  const [cities, setCities] = useState<CityMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCities = useMemo(() => {
    let filtered = cities;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(city =>
        city.name.toLowerCase().includes(term) ||
        city.country?.countryName.toLowerCase().includes(term) ||
        city.country?.countryCode.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [cities, searchTerm]);

  const loadCities = async () => {
    try {
      setLoading(true);
      const response = await cityMasterAPI.getAll({ limit: 1000 });
      setCities(response.data.cityMasters || []);
    } catch (error) {
      console.error('Error loading cities:', error);
      toast.error('Failed to load cities');
    } finally {
      setLoading(false);
    }
  };

  const createCity = async (data: CreateCityMasterRequest) => {
    try {
      const response = await cityMasterAPI.create(data);
      await loadCities();
      return response.data.cityMaster;
    } catch (error: any) {
      console.error('Error creating city:', error);
      toast.error(error.response?.data?.error || 'Failed to create city');
      throw error;
    }
  };

  const updateCity = async (id: string, data: UpdateCityMasterRequest) => {
    try {
      const response = await cityMasterAPI.update(id, data);
      await loadCities();
      return response.data.cityMaster;
    } catch (error: any) {
      console.error('Error updating city:', error);
      toast.error(error.response?.data?.error || 'Failed to update city');
      throw error;
    }
  };

  const deleteCity = async (id: string) => {
    try {
      await cityMasterAPI.delete(id);
      await loadCities();
      toast.success('City deleted successfully');
    } catch (error: any) {
      console.error('Error deleting city:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete city';
      const errorDetails = error.response?.data?.details;
      toast.error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      throw error;
    }
  };

  const toggleCityStatus = async (id: string) => {
    try {
      const response = await cityMasterAPI.toggleStatus(id);
      await loadCities();
      const city = response.data.cityMaster;
      toast.success(`City ${city.isActive ? 'activated' : 'deactivated'} successfully`);
      return city;
    } catch (error: any) {
      console.error('Error toggling city status:', error);
      toast.error(error.response?.data?.error || 'Failed to toggle city status');
      throw error;
    }
  };

  useEffect(() => {
    loadCities();
  }, []);

  return {
    cities,
    filteredCities,
    loading,
    searchTerm,
    setSearchTerm,
    loadCities,
    createCity,
    updateCity,
    deleteCity,
    toggleCityStatus,
  };
}

