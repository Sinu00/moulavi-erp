'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import { serviceAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { 
  Menu, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Eye, 
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  FileText
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface UmrahPassenger {
  id: string;
  bookingId: string;
  isLeadPassenger: boolean;
  fullName: string;
  passportNumber: string;
  nationality: string;
  passportExpiry: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  phoneNumber?: string;
}

interface UmrahVisaBooking {
  id: string;
  serviceId: string;
  bookingMode: string;
  groupNumber?: string;
  groupName?: string;
  flightNumber: string;
  arrivalDate: string;
  departureDate: string;
  arrivalAirport: string;
  transportRoute?: string;
  transportType?: string;
  transportPax?: number;
  transportPrice?: number;
  accommodationType: string;
  makkahCheckIn?: string;
  makkahCheckOut?: string;
  madinaCheckIn?: string;
  madinaCheckOut?: string;
  iqamaNumber?: string;
  iqamaName?: string;
  iqamaDob?: string;
  iqamaMobile?: string;
  passengerCount: number;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
  updatedAt: string;
  passengers: UmrahPassenger[];
  service: {
    id: string;
    status: string;
    submittedAt: string;
    createdAt: string;
    party: {
      email: string;
      contactNumber?: string;
      whatsappNumber?: string;
    };
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function UmrahVisaPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [umrahVisas, setUmrahVisas] = useState<UmrahVisaBooking[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication on client side only
    const currentUser = getUser();
    setUser(currentUser);
    
    if (!currentUser || !hasRole(['admin', 'staff'])) {
      router.push('/auth');
      return;
    }
    
    setIsAuthenticated(true);

    if (!hasLoaded) {
      loadUmrahVisas();
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  const loadUmrahVisas = async (page = 1, status?: string) => {
    try {
      setLoading(true);
      const params: any = { page, limit: 10 };
      if (status && status !== 'all') params.status = status;
      
      const response = await serviceAPI.getUmrahVisas(params);
      setUmrahVisas(response.data.umrahVisas);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error loading Umrah visas:', error);
      toast.error('Failed to load Umrah visa requests');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      setUpdatingStatus(id);
      await serviceAPI.updateUmrahVisaStatus(id, newStatus);
      
      // Update local state
      setUmrahVisas(prev => 
        prev.map(booking => 
          booking.id === id ? { ...booking, status: newStatus as any } : booking
        )
      );
      
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

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
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      processing: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
      completed: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredVisas = umrahVisas.filter(booking => {
    // Search in lead passenger details
    const leadPassenger = booking.passengers.find(p => p.isLeadPassenger);
    const matchesSearch = 
      (leadPassenger?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (leadPassenger?.passportNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.groupName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || statusFilter === 'all' || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Show loading state during authentication check
  if (!isAuthenticated && !user) {
    return (
      <div className="flex h-screen bg-gray-50/50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header Bar */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Umrah Visa Requests</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage Umrah visa applications
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadUmrahVisas(pagination.page, statusFilter)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, passport, or party..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <Select value={statusFilter} onValueChange={(value) => {
                    setStatusFilter(value);
                    loadUmrahVisas(1, value);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Umrah Visa Requests Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">
                    Umrah Visa Requests ({pagination.total})
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage Umrah visa applications from parties
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : filteredVisas.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Umrah visa requests found</h3>
                  <p className="text-gray-500">
                    {searchTerm || statusFilter 
                      ? 'Try adjusting your search or filter criteria.'
                      : 'No Umrah visa applications have been submitted yet.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredVisas.map((booking) => {
                    const leadPassenger = booking.passengers.find(p => p.isLeadPassenger);
                    return (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User className="h-6 w-6 text-indigo-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {leadPassenger?.fullName || 'N/A'}
                            </h3>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">{leadPassenger?.gender || 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                              {booking.groupName || booking.service.party.email}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <FileText className="h-3 w-3 mr-1" />
                              {leadPassenger?.passportNumber || 'N/A'}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {booking.arrivalDate ? new Date(booking.arrivalDate).toLocaleDateString() : 'N/A'}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {booking.departureDate ? new Date(booking.departureDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(booking.status)}
                        <Select
                          value={booking.status}
                          onValueChange={(value) => handleStatusUpdate(booking.id, value)}
                          disabled={updatingStatus === booking.id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadUmrahVisas(pagination.page - 1, statusFilter)}
                      disabled={pagination.page === 1 || loading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadUmrahVisas(pagination.page + 1, statusFilter)}
                      disabled={pagination.page === pagination.totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
