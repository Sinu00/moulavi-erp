'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getUser, hasRole, removeUser } from '@/lib/auth';
import { umrahVisaAPI, authAPI } from '@/lib/api';
import ViewUmrahVisaDialog from '@/components/ViewUmrahVisaDialog';
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
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  Activity,
  Plane,
  MapPin,
  Bell,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';

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
  groupNumber?: string;
  groupName?: string;
  passengerCount: number;
  status: 'group_processing' | 'group_assigned' | 'documents_downloaded' | 'booking_success' | 'cancelled';
  visaType?: 'individual_visa' | 'group_visa';
  createdAt: string;
  updatedAt: string;
  passengers: UmrahPassenger[];
  service: {
    id: string;
    party: {
      id: string;
      partyName: string;
      email: string;
      contactNumber?: string;
      whatsappNumber?: string;
    };
  };
}

export default function PartyDashboardPage() {
  const router = useRouter();
  const user = getUser();
  const [bookings, setBookings] = useState<UmrahVisaBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<UmrahVisaBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });

  useEffect(() => {
    if (!user || !hasRole('party')) {
      router.push('/');
      return;
    }

    // Only load services once when component mounts
    loadServices();
  }, []); // Empty dependency array to run only once

  // Filter bookings based on search term and status
  useEffect(() => {
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.service.party.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.groupNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.groupName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter]);

  const loadServices = async () => {
    // Prevent multiple simultaneous calls
    if (loadingServices) {
      return;
    }
    
    setLoadingServices(true);
    setLoading(true);
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Services loading timeout - forcing loading to false');
      setLoading(false);
      setLoadingServices(false);
    }, 10000); // 10 second timeout
    
    try {
      // Use the same endpoint as admin but filter by party
      const response = await umrahVisaAPI.getBookings({ page: 1, limit: 50 });
      const bookingsData = response.data.bookings || [];
      
      // Filter bookings for current party (done on backend via authentication)
      setBookings(bookingsData);

      // Calculate stats using booking status
      setStats({
        total: bookingsData.length,
        pending: bookingsData.filter((b: UmrahVisaBooking) => 
          ['group_processing', 'group_assigned', 'documents_downloaded'].includes(b.status)
        ).length,
        completed: bookingsData.filter((b: UmrahVisaBooking) => b.status === 'booking_success').length,
      });
    } catch (error) {
      console.error('Error loading bookings:', error);
      setBookings([]);
      setStats({
        total: 0,
        pending: 0,
        completed: 0,
      });
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setLoadingServices(false);
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
      group_processing: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Processing' },
      group_assigned: { color: 'bg-blue-100 text-blue-800', icon: Users, label: 'Assigned' },
      documents_downloaded: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Downloaded' },
      booking_success: { color: 'bg-red-100 text-red-800', icon: CheckCircle, label: 'Success' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.group_processing;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleViewBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setViewDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'group_processing':
        return <Clock className="h-4 w-4 text-gray-600" />;
      case 'group_assigned':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'documents_downloaded':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'booking_success':
        return <CheckCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };


  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <PartyLayout 
      title="Dashboard Overview" 
      subtitle={`Welcome back, ${user.name}`}
    >
      <div className="p-6">
        {/* Stats Overview */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="text-center">
                    <Skeleton className="h-8 w-12 mx-auto mb-2" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
                    <div className="text-sm text-red-600 font-medium">Total Applications</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-1">{stats.pending}</div>
                    <div className="text-sm text-red-600 font-medium">Pending Applications</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-1">{stats.completed}</div>
                    <div className="text-sm text-red-600 font-medium">Completed Applications</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
              <p className="text-sm text-gray-600">Your latest applications</p>
            </div>
          </div>
          
          <div className="p-6">
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
            ) : filteredBookings.length === 0 ? (
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
              <div className="space-y-3">
                {filteredBookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center">
                        <Building className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {booking.groupName || 'Umrah Application'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {booking.groupNumber || 'No group'} • {format(new Date(booking.createdAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(booking.status)}
                      <Button
                        onClick={() => handleViewBooking(booking.id)}
                        size="sm"
                        variant="ghost"
                        className="text-gray-600 hover:text-red-600 hover:bg-red-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {filteredBookings.length > 5 && (
                  <div className="text-center pt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-gray-600 hover:text-red-600 hover:border-red-200"
                    >
                      View All Applications ({filteredBookings.length})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Dialog */}
      <ViewUmrahVisaDialog
        bookingId={selectedBookingId}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
    </PartyLayout>
  );
}


