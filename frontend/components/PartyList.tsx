'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { partyAPI } from '@/lib/api';
import { Search, Mail, Phone, MapPin } from 'lucide-react';

export default function PartyList() {
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    loadParties();
  }, [page, search]);

  const loadParties = async () => {
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
      console.error('Error loading parties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on search
  };

  if (loading && parties.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading parties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Party List */}
      {parties.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No parties found</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {parties.map((party) => (
              <div
                key={party.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{party.party_name}</h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-2" />
                        {party.email}
                      </div>
                      {party.contact_number && (
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-2" />
                          {party.contact_number}
                        </div>
                      )}
                      {party.address && (
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-2" />
                          {party.address}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      party.customer_type === 'b2b' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {party.customer_type.toUpperCase()}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      {party.account_currency}
                    </div>
                    {party.login_required && (
                      <div className="text-xs text-indigo-600 mt-1">
                        ✓ Login enabled
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

