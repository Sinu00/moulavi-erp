'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { airportMasterAPI } from '@/lib/api';

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

export function useAirportMaster() {
  const [airports, setAirports] = useState<AirportMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAirports = async () => {
    try {
      setLoading(true);
      const response = await airportMasterAPI.getAll();
      setAirports(response.data.airports || []);
    } catch (error) {
      toast.error('Failed to load airports');
      console.error('Error loading airports:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAirport = async (data: CreateAirportMasterRequest) => {
    try {
      await airportMasterAPI.create(data);
      toast.success('Airport created successfully');
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
      await airportMasterAPI.update(id, data);
      toast.success('Airport updated successfully');
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
      await airportMasterAPI.delete(id);
      toast.success('Airport deleted successfully');
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
      await airportMasterAPI.update(airport.id, {
        isActive: !airport.isActive
      });
      toast.success(`Airport ${!airport.isActive ? 'activated' : 'deactivated'} successfully`);
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
