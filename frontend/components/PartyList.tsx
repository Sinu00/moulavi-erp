'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { partyAPI } from '@/lib/api';
import { Search, Mail, Phone, MapPin } from 'lucide-react';
import { Party, PaginationInfo } from '@/types';

export default function PartyList() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

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
      // Error handling is done by the API interceptor
      setParties([]);
      setPagination(null);
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
                className="border rounded-lg p-3 lg:p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base lg:text-lg truncate">{party.partyName}</h3>
                    <div className="mt-2 space-y-1 text-xs lg:text-sm text-gray-600">
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-2 flex-shrink-0" />
                        <span className="truncate">{party.email}</span>
                      </div>
                      {party.contactNumber && (
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
                          <span>{party.contactNumber}</span>
                        </div>
                      )}
                      {party.address && (
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-2 flex-shrink-0" />
                          <span className="line-clamp-2">{party.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-2 sm:text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      party.customerType === 'b2b' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {party.customerType.toUpperCase()}
                    </span>
                    <div className="flex items-center sm:justify-end gap-2">
                      <div className="text-xs text-gray-500">
                        {party.accountCurrency?.currencyCode || 'N/A'}
                      </div>
                      {party.loginRequired && (
                        <div className="text-xs text-indigo-600">
                          ✓ Login
                        </div>
                      )}
                    </div>
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

