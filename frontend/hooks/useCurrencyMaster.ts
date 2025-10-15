'use client';

import { useState, useEffect } from 'react';
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
      setCurrencies(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load currencies');
      console.error('Error loading currencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCurrency = async (data: CreateCurrencyMasterRequest) => {
    try {
      await currencyMasterAPI.create(data);
      toast.success('Currency created successfully');
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
      toast.success('Currency updated successfully');
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
      toast.success('Currency deleted successfully');
      await loadCurrencies();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete currency';
      toast.error(errorMessage);
      console.error('Error deleting currency:', error);
      return false;
    }
  };


  const filteredCurrencies = currencies.filter(currency =>
    currency.currencyCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.currencyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

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