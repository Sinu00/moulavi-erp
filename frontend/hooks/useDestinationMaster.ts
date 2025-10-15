'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { destinationMasterAPI } from '@/lib/api';
import { DestinationMaster, CreateDestinationMasterRequest, UpdateDestinationMasterRequest } from '@/types';

export function useDestinationMaster() {
  const [destinations, setDestinations] = useState<DestinationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDestinations = useMemo(() => {
    if (!searchTerm) return destinations;
    
    const term = searchTerm.toLowerCase();
    return destinations.filter(destination =>
      destination.destinationName.toLowerCase().includes(term) ||
      destination.destinationCode.toLowerCase().includes(term) ||
      destination.city.toLowerCase().includes(term) ||
      destination.country.toLowerCase().includes(term)
    );
  }, [destinations, searchTerm]);

  const loadDestinations = async () => {
    try {
      setLoading(true);
      const response = await destinationMasterAPI.getAll({ limit: 1000 });
      setDestinations(response.data.destinationMasters || []);
    } catch (error) {
      console.error('Error loading destinations:', error);
      toast.error('Failed to load destinations');
    } finally {
      setLoading(false);
    }
  };

  const createDestination = async (data: CreateDestinationMasterRequest): Promise<boolean> => {
    try {
      await destinationMasterAPI.create(data);
      toast.success('Destination created successfully');
      await loadDestinations();
      return true;
    } catch (error: any) {
      console.error('Error creating destination:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create destination';
      toast.error(errorMessage);
      return false;
    }
  };

  const updateDestination = async (id: string, data: UpdateDestinationMasterRequest): Promise<boolean> => {
    try {
      await destinationMasterAPI.update(id, data);
      toast.success('Destination updated successfully');
      await loadDestinations();
      return true;
    } catch (error: any) {
      console.error('Error updating destination:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update destination';
      toast.error(errorMessage);
      return false;
    }
  };

  const deleteDestination = async (id: string): Promise<boolean> => {
    try {
      await destinationMasterAPI.delete(id);
      toast.success('Destination deleted successfully');
      await loadDestinations();
      return true;
    } catch (error: any) {
      console.error('Error deleting destination:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete destination';
      toast.error(errorMessage);
      return false;
    }
  };

  const toggleDestinationStatus = async (destination: DestinationMaster): Promise<boolean> => {
    try {
      await destinationMasterAPI.toggleStatus(destination.id);
      toast.success(`Destination ${destination.isActive ? 'deactivated' : 'activated'} successfully`);
      await loadDestinations();
      return true;
    } catch (error: any) {
      console.error('Error toggling destination status:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update destination status';
      toast.error(errorMessage);
      return false;
    }
  };

  useEffect(() => {
    loadDestinations();
  }, []);

  return {
    destinations,
    loading,
    searchTerm,
    setSearchTerm,
    filteredDestinations,
    createDestination,
    updateDestination,
    deleteDestination,
    toggleDestinationStatus,
    loadDestinations
  };
}
