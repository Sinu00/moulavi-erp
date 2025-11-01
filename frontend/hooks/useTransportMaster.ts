'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { transportMasterAPI, locationMasterAPI } from '@/lib/api';
import { TransportMaster, CreateTransportMasterRequest, UpdateTransportMasterRequest, LocationMaster } from '@/types';

export function useTransportMaster() {
  const [transports, setTransports] = useState<TransportMaster[]>([]);
  const [destinations, setDestinations] = useState<LocationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransports = useMemo(() => {
    if (!searchTerm) return transports;
    
    const term = searchTerm.toLowerCase();
    return transports.filter(transport =>
      transport.vehicleType?.vehicleName?.toLowerCase().includes(term) ||
      transport.fromLocation?.name?.toLowerCase().includes(term) ||
      transport.toLocation?.name?.toLowerCase().includes(term) ||
      transport.vehicleType?.paxCount.toString().includes(term) ||
      transport.price.toString().includes(term)
    );
  }, [transports, searchTerm]);

  const loadTransports = async () => {
    try {
      setLoading(true);
      const response = await transportMasterAPI.getAll({ limit: 1000 });
      setTransports(response.data.transportMasters || []);
    } catch (error) {
      console.error('Error loading transports:', error);
      toast.error('Failed to load transport routes');
    } finally {
      setLoading(false);
    }
  };

  const loadDestinations = async () => {
    try {
      const response = await locationMasterAPI.getActive({ locationType: 'DESTINATION' });
      setDestinations(response.data.locationMasters || []);
    } catch (error) {
      console.error('Error loading destinations:', error);
      toast.error('Failed to load destinations');
    }
  };

  const createTransport = async (data: CreateTransportMasterRequest): Promise<boolean> => {
    try {
      await transportMasterAPI.create(data);
      // Don't show success toast here - parent component will handle it
      await loadTransports();
      return true;
    } catch (error: any) {
      console.error('Error creating transport:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create transport route';
      toast.error(errorMessage);
      return false;
    }
  };

  const updateTransport = async (id: string, data: UpdateTransportMasterRequest): Promise<boolean> => {
    try {
      await transportMasterAPI.update(id, data);
      // Don't show success toast here - parent component will handle it
      await loadTransports();
      return true;
    } catch (error: any) {
      console.error('Error updating transport:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update transport route';
      toast.error(errorMessage);
      return false;
    }
  };

  const deleteTransport = async (id: string): Promise<boolean> => {
    try {
      await transportMasterAPI.delete(id);
      // Don't show success toast here - parent component will handle it
      await loadTransports();
      return true;
    } catch (error: any) {
      console.error('Error deleting transport:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete transport route';
      toast.error(errorMessage);
      return false;
    }
  };

  const toggleTransportStatus = async (transport: TransportMaster): Promise<boolean> => {
    try {
      await transportMasterAPI.toggleStatus(transport.id);
      // Don't show success toast here - parent component will handle it
      await loadTransports();
      return true;
    } catch (error: any) {
      console.error('Error toggling transport status:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update transport route status';
      toast.error(errorMessage);
      return false;
    }
  };

  useEffect(() => {
    loadTransports();
    loadDestinations();
  }, []);

  return {
    transports,
    destinations,
    loading,
    searchTerm,
    setSearchTerm,
    filteredTransports,
    createTransport,
    updateTransport,
    deleteTransport,
    toggleTransportStatus,
    loadTransports
  };
}
