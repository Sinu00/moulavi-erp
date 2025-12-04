'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUser, hasRole } from '@/lib/auth';
import { umrahVisaAPI } from '@/lib/api';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Hash,
  Users,
  Calendar,
  Building,
  Eye,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface UmrahVisaBooking {
  id: string;
  bookingId?: string;
  groupNumber?: string;
  groupName?: string;
  passengerCount: number;
  status: 'pending' | 'documents_downloaded' | 'group_assigned' | 'voucher' | 'bill' | 'booking_success' | 'cancelled';
  createdAt: string;
  party?: {
    id: string;
    partyName: string;
    email: string;
  };
}

export default function PartyDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<UmrahVisaBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });
  const loadingRef = useRef(false);

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    setUser(currentUser);
  }, []);

  // Load bookings and calculate stats
  const loadBookings = async () => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      
      const params = { 
        page: String(pagination.page), 
        limit: String(pagination.limit),
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      
      const response = await umrahVisaAPI.getBookings(params);
      const bookingsData = response.data.bookings || [];
      const paginationData = response.data.pagination || {
        page: pagination.page,
        limit: pagination.limit,
        total: bookingsData.length,
        totalPages: 1,
      };
      
      setBookings(bookingsData);
      setPagination(paginationData);
      
      // Calculate stats from total count
      const total = paginationData.total || 0;
      
      // Get stats from a separate call for accuracy
      try {
        const statsResponse = await umrahVisaAPI.getBookings({ page: 1, limit: 1000 });
        const allBookings = statsResponse.data.bookings || [];
        setStats({
          total: allBookings.length,
          pending: allBookings.filter((b: UmrahVisaBooking) => 
            ['pending', 'documents_downloaded', 'group_assigned', 'voucher', 'bill'].includes(b.status)
          ).length,
          completed: allBookings.filter((b: UmrahVisaBooking) => b.status === 'booking_success').length,
        });
      } catch {
        // If stats fail, use total from pagination
        setStats(prev => ({ ...prev, total }));
      }
    } catch (error) {
      setBookings([]);
      setStats({ total: 0, pending: 0, completed: 0 });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Auth check and redirect
  useEffect(() => {
    if (!mounted) return;
    
    if (!user || !hasRole('party')) {
      router.push('/');
      return;
    }
  }, [mounted, user, router]);

  // Load bookings when filters/pagination change (only after user is confirmed)
  useEffect(() => {
    if (!mounted || !user || !hasRole('party')) return;
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, user, pagination.page, pagination.limit, searchTerm, statusFilter]);

  const getStatusBadge = (status: string) => {
    if (!status) {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-0">
          <Clock className="h-3 w-3 mr-1" />
          Unknown
        </Badge>
      );
    }

    const statusConfig = {
      pending: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Pending' },
      documents_downloaded: { color: 'bg-yellow-100 text-yellow-800', icon: FileText, label: 'Documents Downloaded' },
      group_assigned: { color: 'bg-blue-100 text-blue-800', icon: Users, label: 'Group Assigned' },
      voucher: { color: 'bg-purple-100 text-purple-800', icon: FileText, label: 'Voucher' },
      bill: { color: 'bg-orange-100 text-orange-800', icon: FileText, label: 'Bill' },
      booking_success: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleViewBooking = (bookingId: string) => {
    router.push(`/party/umrah-visa/view/${bookingId}`);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };


  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasRole('party')) {
    return null;
  }

  return (
    <PartyLayout 
      title="Dashboard Overview" 
      subtitle={`Welcome back, ${user.name}`}
    >
      <div className="p-4 lg:p-6">
        {/* Stats Overview */}
        <div className="mb-6 lg:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 lg:p-6 shadow-sm border border-gray-100">
                  <div className="text-center">
                    <Skeleton className="h-8 w-12 mx-auto mb-2" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm border border-gray-100">
                  <div className="text-center">
                    <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
                    <div className="text-xs lg:text-sm text-red-600 font-medium">Total Applications</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm border border-gray-100">
                  <div className="text-center">
                    <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{stats.pending}</div>
                    <div className="text-xs lg:text-sm text-red-600 font-medium">Pending Applications</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm border border-gray-100">
                  <div className="text-center">
                    <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{stats.completed}</div>
                    <div className="text-xs lg:text-sm text-red-600 font-medium">Completed Applications</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* All Applications */}
        <div className="bg-white rounded-lg lg:rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 lg:p-6 border-b border-gray-200">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">All Applications</h2>
              <p className="text-sm text-gray-600">View and manage all your applications</p>
            </div>
            
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by group number..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="documents_downloaded">Documents Downloaded</SelectItem>
                  <SelectItem value="group_assigned">Group Assigned</SelectItem>
                  <SelectItem value="voucher">Voucher</SelectItem>
                  <SelectItem value="bill">Bill</SelectItem>
                  <SelectItem value="booking_success">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="p-4 lg:p-6">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
                <p className="text-gray-500 mb-6">Get started by applying for your first Umrah visa</p>
                <Button 
                  onClick={() => router.push('/party/umrah-visa')}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Apply for Umrah Visa
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-3 lg:space-y-4">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-gray-200 rounded-lg lg:rounded-xl bg-white hover:shadow-md transition-all hover:border-red-200"
                    >
                      <div className="p-4 lg:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          {/* Icon and Main Content */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-lg bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center flex-shrink-0">
                              <Building className="h-5 w-5 lg:h-6 lg:w-6 text-red-600" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-base lg:text-lg mb-2">
                                {booking.groupName || booking.party?.partyName || 'Umrah Application'}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 lg:gap-3 text-xs lg:text-sm text-gray-600 mb-2">
                                {booking.groupNumber && (
                                  <span className="flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    {booking.groupNumber}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {booking.passengerCount || 0} passengers
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(booking.createdAt), 'MMM dd, yyyy')}
                                </span>
                              </div>
                              {booking.bookingId && (
                                <p className="text-xs text-gray-500 font-mono truncate">
                                  ID: {booking.bookingId}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Status and Actions */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 flex-shrink-0">
                            {getStatusBadge(booking.status)}
                            <Button
                              onClick={() => handleViewBooking(booking.id)}
                              size="sm"
                              variant="outline"
                              className="w-full sm:w-auto border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
                            >
                              <Eye className="h-4 w-4 mr-1.5" />
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 lg:gap-4">
                      <div className="text-xs lg:text-sm text-gray-600 text-center sm:text-left">
                        Showing <span className="font-medium text-gray-900">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                        <span className="font-medium text-gray-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                        <span className="font-medium text-gray-900">{pagination.total}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 lg:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          disabled={pagination.page === 1 || loading}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline">Previous</span>
                        </Button>
                        
                        {/* Page Numbers - Simplified for mobile */}
                        <div className="hidden sm:flex items-center gap-1">
                          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (pagination.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (pagination.page <= 3) {
                              pageNum = i + 1;
                            } else if (pagination.page >= pagination.totalPages - 2) {
                              pageNum = pagination.totalPages - 4 + i;
                            } else {
                              pageNum = pagination.page - 2 + i;
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={pagination.page === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                                disabled={loading}
                                className={pagination.page === pageNum ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <div className="sm:hidden text-sm text-gray-600 px-2">
                          {pagination.page} / {pagination.totalPages}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          disabled={pagination.page === pagination.totalPages || loading}
                          className="gap-1"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PartyLayout>
  );
}


