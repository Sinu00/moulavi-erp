import { useState, useEffect, useCallback } from 'react';
import { partyAPI } from '@/lib/api';
import { Party, PaginationInfo } from '@/types';

export function useParties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'b2b'>('all');

  const loadParties = useCallback(async () => {
    setLoading(true);
    try {
      const response = await partyAPI.getAll({
        page,
        limit: 10,
        search: search || undefined,
      });
      setParties(response.data.parties);
      setPagination(response.data.pagination);
    } catch (error) {
      setParties([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadParties();
  }, [loadParties]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((type: 'all' | 'direct' | 'b2b') => {
    setFilterType(type);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleSelectParty = useCallback((partyId: string) => {
    setSelectedParties(prev => 
      prev.includes(partyId) 
        ? prev.filter(id => id !== partyId)
        : [...prev, partyId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedParties(prev => 
      prev.length === parties.length 
        ? [] 
        : parties.map(p => p.id)
    );
  }, [parties]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedParties.length === 0) {
      return false;
    }

    try {
      await Promise.all(selectedParties.map(id => partyAPI.delete(id)));
      setSelectedParties([]);
      await loadParties();
      return true;
    } catch (error) {
      return false;
    }
  }, [selectedParties, loadParties]);

  const handlePartyDeleted = useCallback(() => {
    loadParties();
  }, [loadParties]);

  const refreshParties = useCallback(() => {
    loadParties();
  }, [loadParties]);

  return {
    // Data
    parties,
    loading,
    search,
    page,
    pagination,
    selectedParties,
    filterType,
    
    // Actions
    handleSearchChange,
    handleFilterChange,
    handlePageChange,
    handleSelectParty,
    handleSelectAll,
    handleBulkDelete,
    handlePartyDeleted,
    refreshParties,
  };
}
