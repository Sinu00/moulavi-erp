'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { locationMasterAPI } from '@/lib/api';
import { LocationMaster, CreateLocationMasterRequest } from '@/types';

interface AirportMaster {
  id: string;
  airportCode: string;
  airportName: string;
  city: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateAirportMasterRequest {
  airportCode: string;
  airportName: string;
  city: string;
  country: string;
  isActive?: boolean;
}

// Helper to transform LocationMaster to AirportMaster format for backward compatibility
const transformLocationToAirport = (location: LocationMaster): AirportMaster => ({
  id: location.id,
  airportCode: location.code,
  airportName: location.name,
  city: location.city,
  country: location.country?.countryName || 'Saudi Arabia',
  isActive: location.isActive,
  createdAt: location.createdAt,
  updatedAt: location.updatedAt,
});

// Helper to transform AirportMaster request to LocationMaster request
const transformAirportToLocation = (
  data: CreateAirportMasterRequest,
  countryId?: string
): CreateLocationMasterRequest => ({
  code: data.airportCode,
  name: data.airportName,
  city: data.city,
  locationType: 'AIRPORT',
  countryId: countryId || '', // Will need to be provided or fetched
  isActive: data.isActive,
});

export function useAirportMaster() {
  const [airports, setAirports] = useState<AirportMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryId, setCountryId] = useState<string>('');

  // Fetch Saudi Arabia country ID on mount
  useEffect(() => {
    const fetchCountryId = async () => {
      try {
        // Try to get from existing airports first
        const response = await locationMasterAPI.getAll({ locationType: 'AIRPORT', limit: 1 });
        if (response.data.locationMasters?.[0]?.countryId) {
          setCountryId(response.data.locationMasters[0].countryId);
        } else {
          // If no airports exist yet, we'll need countryId when creating
          // For now, we'll show an error if creating without countryId
          console.warn('No airports found. Country ID will need to be provided when creating first airport.');
        }
      } catch (error) {
        console.error('Error fetching country ID:', error);
      }
    };
    fetchCountryId();
  }, []);

  const loadAirports = async () => {
    try {
      setLoading(true);
      const response = await locationMasterAPI.getAll({
        locationType: 'AIRPORT',
        page: 1,
        limit: 1000, // Get all airports
      });
      
      const locations: LocationMaster[] = response.data.locationMasters || [];
      const transformed = locations.map(transformLocationToAirport);
      setAirports(transformed);
    } catch (error) {
      toast.error('Failed to load airports');
      console.error('Error loading airports:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAirport = async (data: CreateAirportMasterRequest) => {
    try {
      // Get country ID if not already set
      let finalCountryId = countryId;
      if (!finalCountryId) {
        const response = await locationMasterAPI.getAll({ locationType: 'AIRPORT', limit: 1 });
        if (response.data.locationMasters?.[0]?.countryId) {
          finalCountryId = response.data.locationMasters[0].countryId;
          setCountryId(finalCountryId);
        }
      }

      if (!finalCountryId) {
        toast.error('Unable to determine country. Please ensure airports exist.');
        return false;
      }

      const locationData = transformAirportToLocation(data, finalCountryId);
      await locationMasterAPI.create(locationData);
      // Don't show success toast here - parent component will handle it
      await loadAirports();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create airport';
      toast.error(errorMessage);
      console.error('Error creating airport:', error);
      return false;
    }
  };

  const updateAirport = async (id: string, data: CreateAirportMasterRequest) => {
    try {
      // Get country ID if not already set
      let finalCountryId = countryId;
      if (!finalCountryId) {
        const response = await locationMasterAPI.getAll({ locationType: 'AIRPORT', limit: 1 });
        if (response.data.locationMasters?.[0]?.countryId) {
          finalCountryId = response.data.locationMasters[0].countryId;
          setCountryId(finalCountryId);
        }
      }

      const updateData: any = {};
      if (data.airportCode !== undefined) updateData.code = data.airportCode;
      if (data.airportName !== undefined) updateData.name = data.airportName;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      
      // If country is provided and different, we'd need to get countryId
      // For now, skip countryId update unless needed

      await locationMasterAPI.update(id, updateData);
      // Don't show success toast here - parent component will handle it
      await loadAirports();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update airport';
      toast.error(errorMessage);
      console.error('Error updating airport:', error);
      return false;
    }
  };

  const deleteAirport = async (id: string) => {
    try {
      await locationMasterAPI.delete(id);
      // Don't show success toast here - parent component will handle it
      await loadAirports();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete airport';
      toast.error(errorMessage);
      console.error('Error deleting airport:', error);
      return false;
    }
  };

  const toggleAirportStatus = async (airport: AirportMaster) => {
    try {
      await locationMasterAPI.update(airport.id, {
        isActive: !airport.isActive
      });
      // Don't show success toast here - parent component will handle it
      await loadAirports();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update airport status';
      toast.error(errorMessage);
      console.error('Error updating airport status:', error);
      return false;
    }
  };

  const filteredAirports = airports.filter(airport =>
    airport.airportCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.airportName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadAirports();
  }, []);

  return {
    airports,
    loading,
    searchTerm,
    setSearchTerm,
    filteredAirports,
    createAirport,
    updateAirport,
    deleteAirport,
    toggleAirportStatus,
    loadAirports
  };
}
