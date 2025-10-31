'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { currencyMasterAPI } from '@/lib/api';

interface CurrencyMaster {
  id: string;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateCurrencyMasterRequest {
  currencyCode: string;
  currencyName: string;
  symbol: string;
}

export function useCurrencyMaster() {
  const [currencies, setCurrencies] = useState<CurrencyMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadCurrencies = async () => {
    try {
      setLoading(true);
      const response = await currencyMasterAPI.getAll();
      console.log('Currency getAll Response:', response);
      console.log('Response data:', response.data);
      // Backend returns: { success: true, data: { currencyMasters: [...] }, pagination: {...} }
      // Axios wraps it in response.data, so we need response.data.data.currencyMasters
      const currencies = response.data?.data?.currencyMasters || response.data?.currencyMasters || response.data || [];
      console.log('Extracted currencies:', currencies);
      // Ensure it's always an array
      const currencyArray = Array.isArray(currencies) ? currencies : [];
      console.log('Setting currencies array:', currencyArray);
      setCurrencies(currencyArray);
    } catch (error) {
      toast.error('Failed to load currencies');
      console.error('Error loading currencies:', error);
      setCurrencies([]);
    } finally {
      setLoading(false);
    }
  };

  const createCurrency = async (data: CreateCurrencyMasterRequest) => {
    try {
      await currencyMasterAPI.create(data);
      // Don't show success toast here - parent component will handle it
      await loadCurrencies();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create currency';
      toast.error(errorMessage);
      console.error('Error creating currency:', error);
      return false;
    }
  };

  const updateCurrency = async (id: string, data: CreateCurrencyMasterRequest) => {
    try {
      await currencyMasterAPI.update(id, data);
      // Don't show success toast here - parent component will handle it
      await loadCurrencies();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update currency';
      toast.error(errorMessage);
      console.error('Error updating currency:', error);
      return false;
    }
  };

  const deleteCurrency = async (id: string) => {
    try {
      await currencyMasterAPI.delete(id);
      // Don't show success toast here - parent component will handle it
      await loadCurrencies();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete currency';
      toast.error(errorMessage);
      console.error('Error deleting currency:', error);
      return false;
    }
  };


  const filteredCurrencies = useMemo(() => {
    if (!Array.isArray(currencies)) {
      return [];
    }
    if (!searchTerm) {
      return currencies;
    }
    const term = searchTerm.toLowerCase();
    return currencies.filter(currency =>
      currency.currencyCode.toLowerCase().includes(term) ||
      currency.currencyName.toLowerCase().includes(term) ||
      currency.symbol.toLowerCase().includes(term)
    );
  }, [currencies, searchTerm]);

  useEffect(() => {
    loadCurrencies();
  }, []);

  return {
    currencies,
    loading,
    searchTerm,
    setSearchTerm,
    filteredCurrencies,
    createCurrency,
    updateCurrency,
    deleteCurrency,
    loadCurrencies
  };
}