'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { countryMasterAPI } from '@/lib/api';
import { CountryMaster } from '@/types';

export function useCountryMaster() {
  const [countries, setCountries] = useState<CountryMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCountries = useMemo(() => {
    if (!searchTerm) return countries;
    
    const term = searchTerm.toLowerCase();
    return countries.filter(country =>
      country.countryName.toLowerCase().includes(term) ||
      country.countryCode.toLowerCase().includes(term) ||
      country.currencyCode.toLowerCase().includes(term)
    );
  }, [countries, searchTerm]);

  const loadCountries = async () => {
    try {
      setLoading(true);
      const response = await countryMasterAPI.getAll({ limit: 1000 });
      console.log('Country getAll Response:', response);
      console.log('Response data:', response.data);
      // Backend returns: { success: true, data: { countryMasters: [...] } }
      // Axios wraps it in response.data, so we need response.data.data.countryMasters
      const countries = response.data?.data?.countryMasters || response.data?.countryMasters || [];
      console.log('Extracted countries:', countries);
      // Ensure it's always an array
      const countryArray = Array.isArray(countries) ? countries : [];
      console.log('Setting countries array:', countryArray);
      setCountries(countryArray);
    } catch (error) {
      console.error('Error loading countries:', error);
      toast.error('Failed to load countries');
      setCountries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCountries();
  }, []);

  return {
    countries,
    loading,
    searchTerm,
    setSearchTerm,
    filteredCountries,
    loadCountries,
  };
}
