import { useState, useEffect, useCallback, useMemo } from 'react';
import { transportMasterAPI } from '@/lib/api';
import { TransportMaster, CreateTransportMasterRequest, UpdateTransportMasterRequest } from '@/types';
import { toast } from 'sonner';

export function useTransportMaster() {
  const [transports, setTransports] = useState<TransportMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTransports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await transportMasterAPI.getAll({ limit: '1000' });
      const transportsData = response.data?.transportMasters || [];
      setTransports(transportsData);
    } catch (error: any) {
      console.error('Error loading transports:', error);
      toast.error('Failed to load transports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransports();
  }, [loadTransports]);

  const filteredTransports = useMemo(() => {
    let filtered = transports;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(transport => {
        const routeString = transport.route ? [
          transport.route.city1?.name,
          transport.route.city2?.name,
          transport.route.city3?.name,
          transport.route.city4?.name,
        ].filter(Boolean).join(' ').toLowerCase() : '';
        const vehicleName = transport.vehicleType?.vehicleName?.toLowerCase() || '';
        return routeString.includes(searchLower) || vehicleName.includes(searchLower);
      });
    }

    return filtered;
  }, [transports, searchTerm]);

  const createTransport = async (data: CreateTransportMasterRequest): Promise<boolean> => {
    try {
      await transportMasterAPI.create(data);
      toast.success('Transport created successfully!');
      await loadTransports();
      return true;
    } catch (error: any) {
      console.error('Error creating transport:', error);
      toast.error(error.response?.data?.error || 'Failed to create transport');
      return false;
    }
  };

  const updateTransport = async (id: string, data: UpdateTransportMasterRequest): Promise<boolean> => {
    try {
      await transportMasterAPI.update(id, data);
      toast.success('Transport updated successfully!');
      await loadTransports();
      return true;
    } catch (error: any) {
      console.error('Error updating transport:', error);
      toast.error(error.response?.data?.error || 'Failed to update transport');
      return false;
    }
  };

  const deleteTransport = async (id: string): Promise<boolean> => {
    try {
      await transportMasterAPI.delete(id);
      toast.success('Transport deleted successfully!');
      await loadTransports();
      return true;
    } catch (error: any) {
      console.error('Error deleting transport:', error);
      toast.error(error.response?.data?.error || 'Failed to delete transport');
      return false;
    }
  };

  const toggleTransportStatus = async (transport: TransportMaster): Promise<boolean> => {
    try {
      await transportMasterAPI.toggleStatus(transport.id);
      toast.success(`Transport ${transport.isActive ? 'deactivated' : 'activated'} successfully!`);
      await loadTransports();
      return true;
    } catch (error: any) {
      console.error('Error toggling transport status:', error);
      toast.error(error.response?.data?.error || 'Failed to toggle transport status');
      return false;
    }
  };

  return {
    transports,
    loading,
    searchTerm,
    setSearchTerm,
    filteredTransports,
    createTransport,
    updateTransport,
    deleteTransport,
    toggleTransportStatus,
    refreshTransports: loadTransports,
  };
}

