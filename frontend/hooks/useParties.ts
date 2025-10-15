import { useState, useEffect, useCallback } from 'react';
import { partyAPI } from '@/lib/api';
import { Party, PaginationInfo } from '@/types';

export function useParties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'b2b'>('all');
  const [totalStats, setTotalStats] = useState<{
    total: number;
    direct: number;
    b2b: number;
    withLogin: number;
  }>({
    total: 0,
    direct: 0,
    b2b: 0,
    withLogin: 0
  });

  const loadParties = useCallback(async () => {
    try {
      setLoading(true);
      // Load all parties without pagination for client-side filtering
      const response = await partyAPI.getAll({ page: 1, limit: 1000 });
      setParties(response.data.parties || []);
      
      // Calculate total stats
      const allParties = response.data.parties || [];
      setTotalStats({
        total: response.data.pagination.total,
        direct: allParties.filter((p: Party) => p.customerType === 'direct').length,
        b2b: allParties.filter((p: Party) => p.customerType === 'b2b').length,
        withLogin: allParties.filter((p: Party) => p.loginRequired).length
      });
    } catch (error) {
      setParties([]);
      console.error('Error loading parties:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Client-side filtering like user master
  const filteredParties = parties.filter(party => {
    const matchesSearch = !searchTerm || 
      party.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      party.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (party.contactNumber && party.contactNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (party.whatsappNumber && party.whatsappNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterType === 'all' || party.customerType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  // Paginate the filtered results
  const itemsPerPage = 10;
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedParties = filteredParties.slice(startIndex, endIndex);
  
  const pagination = {
    page,
    totalPages: Math.ceil(filteredParties.length / itemsPerPage),
    total: filteredParties.length,
    limit: itemsPerPage
  };

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
      prev.length === paginatedParties.length 
        ? [] 
        : paginatedParties.map(p => p.id)
    );
  }, [paginatedParties]);

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

  useEffect(() => {
    loadParties();
  }, [loadParties]);

  return {
    // Data
    parties: paginatedParties,
    loading,
    searchTerm,
    page,
    pagination,
    selectedParties,
    filterType,
    totalStats,
    
    // Actions
    setSearchTerm,
    handleFilterChange,
    handlePageChange,
    handleSelectParty,
    handleSelectAll,
    handleBulkDelete,
    handlePartyDeleted,
    refreshParties,
  };
}
