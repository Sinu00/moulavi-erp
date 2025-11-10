import { useState, useEffect, useCallback, useMemo } from 'react';
import { transportRouteMasterAPI } from '@/lib/api';
import { TransportRouteMaster, RouteType, CreateTransportRouteMasterRequest, UpdateTransportRouteMasterRequest } from '@/types';
import { toast } from 'sonner';

export function useTransportRouteMaster() {
  const [routes, setRoutes] = useState<TransportRouteMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRouteType, setFilterRouteType] = useState<RouteType | undefined>(undefined);

  // Wrap loadRoutes in useCallback to prevent infinite loops
  const loadRoutes = useCallback(async () => {
    console.log('[useTransportRouteMaster] loadRoutes called');
    try {
      setLoading(true);
      const response = await transportRouteMasterAPI.getAll({ limit: '1000' });
      console.log('[useTransportRouteMaster] getAll Response:', response);
      // Backend returns: { transportRouteMasters: [...], pagination: {...} }
      // Axios wraps it in response.data, so we need response.data.transportRouteMasters
      const routesData = response.data?.transportRouteMasters || response.data?.data?.transportRouteMasters || [];
      console.log('[useTransportRouteMaster] Routes loaded:', routesData.length);
      setRoutes(routesData);
    } catch (error: any) {
      console.error('[useTransportRouteMaster] Error loading routes:', error);
      toast.error('Failed to load routes');
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array - this function doesn't depend on any props or state

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const filteredRoutes = useMemo(() => {
    let filtered = routes;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(route => {
        const cities = [
          route.city1?.name,
          route.city2?.name,
          route.city3?.name,
          route.city4?.name,
        ].filter(Boolean).join(' ').toLowerCase();
        return cities.includes(searchLower) || route.routeType.toLowerCase().includes(searchLower);
      });
    }

    if (filterRouteType) {
      filtered = filtered.filter(route => route.routeType === filterRouteType);
    }

    return filtered;
  }, [routes, searchTerm, filterRouteType]);

  const createRoute = useCallback(async (data: CreateTransportRouteMasterRequest): Promise<boolean> => {
    console.log('[useTransportRouteMaster] createRoute called', { data });
    try {
      const response = await transportRouteMasterAPI.create(data);
      console.log('[useTransportRouteMaster] Route created, response:', response);
      // Don't show success toast here - parent component will handle it
      console.log('[useTransportRouteMaster] Reloading routes...');
      await loadRoutes();
      console.log('[useTransportRouteMaster] Routes reloaded');
      return true;
    } catch (error: any) {
      console.error('[useTransportRouteMaster] Error creating route:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create route';
      toast.error(errorMessage);
      return false;
    }
  }, [loadRoutes]);

  const updateRoute = useCallback(async (id: string, data: UpdateTransportRouteMasterRequest): Promise<boolean> => {
    try {
      await transportRouteMasterAPI.update(id, data);
      // Don't show success toast here - parent component will handle it
      await loadRoutes();
      return true;
    } catch (error: any) {
      console.error('Error updating route:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update route';
      toast.error(errorMessage);
      return false;
    }
  }, [loadRoutes]);

  const deleteRoute = useCallback(async (id: string): Promise<boolean> => {
    try {
      await transportRouteMasterAPI.delete(id);
      // Don't show success toast here - parent component will handle it
      await loadRoutes();
      return true;
    } catch (error: any) {
      console.error('Error deleting route:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete route';
      toast.error(errorMessage);
      return false;
    }
  }, [loadRoutes]);

  const toggleRouteStatus = useCallback(async (route: TransportRouteMaster): Promise<boolean> => {
    try {
      await transportRouteMasterAPI.toggleStatus(route.id);
      // Don't show success toast here - parent component will handle it
      await loadRoutes();
      return true;
    } catch (error: any) {
      console.error('Error toggling route status:', error);
      const errorMessage = error.response?.data?.error || 'Failed to toggle route status';
      toast.error(errorMessage);
      return false;
    }
  }, [loadRoutes]);

  return {
    routes,
    loading,
    searchTerm,
    setSearchTerm,
    filterRouteType,
    setFilterRouteType,
    filteredRoutes,
    createRoute,
    updateRoute,
    deleteRoute,
    toggleRouteStatus,
    refreshRoutes: loadRoutes,
  };
}

