'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getUser, hasRole, removeUser } from '@/lib/auth';
import { umrahVisaAPI, authAPI } from '@/lib/api';
import ViewUmrahVisaDialog from '@/components/ViewUmrahVisaDialog';
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  LogOut, 
  User,
  Hash,
  Users,
  Calendar,
  Building,
  Eye,
  AlertCircle,
  RefreshCw
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
  bookingMode: string;
  groupNumber?: string;
  groupName?: string;
  flightNumber: string;
  arrivalDate: string;
  departureDate: string;
  arrivalAirport: string;
  passengerCount: number;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'completed';
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
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
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
      const response = await umrahVisaAPI.getPartyBookings({ page: 1, limit: 50 });
      const bookingsData = response.data.bookings || [];
      setBookings(bookingsData);

      // Calculate stats using booking status
      setStats({
        total: bookingsData.length,
        pending: bookingsData.filter((b: UmrahVisaBooking) => b.status === 'pending').length,
        processing: bookingsData.filter((b: UmrahVisaBooking) => b.status === 'processing').length,
        completed: bookingsData.filter((b: UmrahVisaBooking) => b.status === 'completed').length,
      });
    } catch (error) {
      console.error('Error loading bookings:', error);
      setBookings([]);
      setStats({
        total: 0,
        pending: 0,
        processing: 0,
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

  const handleViewBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setViewDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'processing':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch (error) {
      // Logout should continue even if API call fails
    } finally {
      removeUser();
      toast.success('Logged out successfully');
      router.push('/');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Party Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Welcome, {user.name}! Manage your service requests here.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{user.name}</span>
                <span className="text-gray-500">({user.role})</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {loading ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-8" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-8" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-18" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-8" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Processing</CardTitle>
                  <FileText className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Available Services */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Available Services</CardTitle>
            <CardDescription>Click on a service to submit a new request</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div
                onClick={() => router.push('/party/umrah-visa')}
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-indigo-50 to-purple-50"
              >
                <h3 className="text-xl font-semibold mb-2">Umrah Visa</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Apply for Umrah visa with all required documentation
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Apply Now
                </Button>
              </div>

              <div className="border rounded-lg p-6 bg-gray-50 opacity-50 cursor-not-allowed">
                <h3 className="text-xl font-semibold mb-2 text-gray-500">More Services</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Coming soon...
                </p>
                <Button disabled variant="outline">
                  Coming Soon
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Umrah Visa Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Your Umrah Visa Bookings</CardTitle>
            <CardDescription>Track the status of your submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
                          <div className="flex-1">
                            <Skeleton className="h-5 w-48 mb-2" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </div>
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 pb-4 border-b">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                  </div>
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                <p className="text-gray-500 mb-4">
                  Click on "Apply Now" above to submit your first Umrah visa request
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="p-3 sm:p-4">
                      {/* Header Section */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <Building className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                                {booking.service.party.partyName}
                              </h3>
                              <p className="text-xs sm:text-sm text-gray-500 truncate">{booking.service.party.email}</p>
                            </div>
                          </div>
                        </div>
                        <div className="sm:ml-4 flex justify-start sm:justify-end">
                          {getStatusBadge(booking.status)}
                        </div>
                      </div>

                      {/* Main Info Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 pb-4 border-b">
                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center">
                            <Hash className="h-3 w-3 mr-1" />
                            Group Number
                          </p>
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {booking.groupNumber || (
                              <span className="text-gray-400">Not Assigned</span>
                            )}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            Group Name
                          </p>
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {booking.groupName || (
                              <span className="text-gray-400">Not Assigned</span>
                            )}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            Passengers
                          </p>
                          <p className="text-xs sm:text-sm font-medium">{booking.passengerCount}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Created
                          </p>
                          <p className="text-xs sm:text-sm font-medium">
                            {new Date(booking.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Action Button - View Only */}
                      <div className="flex items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewBooking(booking.id)}
                          className="flex items-center justify-center text-xs sm:text-sm"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Dialog */}
      <ViewUmrahVisaDialog
        bookingId={selectedBookingId}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
    </div>
  );
}

