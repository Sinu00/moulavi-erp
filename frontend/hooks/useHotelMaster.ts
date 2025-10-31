'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { hotelMasterAPI, locationMasterAPI } from '@/lib/api';
import { HotelMaster, CreateHotelMasterRequest, UpdateHotelMasterRequest, LocationMaster } from '@/types';

export function useHotelMaster() {
  const [hotels, setHotels] = useState<HotelMaster[]>([]);
  const [destinations, setDestinations] = useState<LocationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHotels = useMemo(() => {
    if (!searchTerm) return hotels;
    
    const term = searchTerm.toLowerCase();
    return hotels.filter(hotel =>
      hotel.hotelName.toLowerCase().includes(term) ||
      hotel.hotelCode.toLowerCase().includes(term) ||
      hotel.location?.name?.toLowerCase().includes(term) ||
      hotel.location?.city.toLowerCase().includes(term)
    );
  }, [hotels, searchTerm]);

  const loadHotels = async () => {
    try {
      setLoading(true);
      const response = await hotelMasterAPI.getAll({ limit: 1000 });
      setHotels(response.data.hotelMasters || []);
    } catch (error) {
      console.error('Error loading hotels:', error);
      toast.error('Failed to load hotels');
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

  const createHotel = async (data: CreateHotelMasterRequest): Promise<boolean> => {
    try {
      await hotelMasterAPI.create(data);
      // Don't show success toast here - parent component will handle it
      await loadHotels();
      return true;
    } catch (error: any) {
      console.error('Error creating hotel:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create hotel';
      toast.error(errorMessage);
      return false;
    }
  };

  const updateHotel = async (id: string, data: UpdateHotelMasterRequest): Promise<boolean> => {
    try {
      await hotelMasterAPI.update(id, data);
      // Don't show success toast here - parent component will handle it
      await loadHotels();
      return true;
    } catch (error: any) {
      console.error('Error updating hotel:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update hotel';
      toast.error(errorMessage);
      return false;
    }
  };

  const deleteHotel = async (id: string): Promise<boolean> => {
    try {
      await hotelMasterAPI.delete(id);
      // Don't show success toast here - parent component will handle it
      await loadHotels();
      return true;
    } catch (error: any) {
      console.error('Error deleting hotel:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete hotel';
      toast.error(errorMessage);
      return false;
    }
  };

  const toggleHotelStatus = async (hotel: HotelMaster): Promise<boolean> => {
    try {
      await hotelMasterAPI.toggleStatus(hotel.id);
      // Don't show success toast here - parent component will handle it
      await loadHotels();
      return true;
    } catch (error: any) {
      console.error('Error toggling hotel status:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update hotel status';
      toast.error(errorMessage);
      return false;
    }
  };

  useEffect(() => {
    loadHotels();
    loadDestinations();
  }, []);

  return {
    hotels,
    destinations,
    loading,
    searchTerm,
    setSearchTerm,
    filteredHotels,
    createHotel,
    updateHotel,
    deleteHotel,
    toggleHotelStatus,
    loadHotels
  };
}
