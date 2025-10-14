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
    processing: 0,
    completed: 0,
    approved: 0,
    rejected: 0,
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
        pending: bookingsData.filter((b: UmrahVisaBooking) => b.status === 'pending').length,
        processing: bookingsData.filter((b: UmrahVisaBooking) => b.status === 'processing').length,
        completed: bookingsData.filter((b: UmrahVisaBooking) => b.status === 'completed').length,
        approved: bookingsData.filter((b: UmrahVisaBooking) => b.status === 'approved').length,
        rejected: bookingsData.filter((b: UmrahVisaBooking) => b.status === 'rejected').length,
      });
    } catch (error) {
      console.error('Error loading bookings:', error);
      setBookings([]);
      setStats({
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        approved: 0,
        rejected: 0,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-white/20 backdrop-blur-sm p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
                  <Building className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    {user.name}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Manage your Services and track their progress
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <div className="h-6 w-px bg-gray-300" />
                <div className="flex items-center space-x-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{user.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {user.role}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-white/60 backdrop-blur-sm border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-8 w-12" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Requests</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                      <p className="text-xs text-gray-500 mt-1">All time</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                      <p className="text-xs text-yellow-600 mt-1">Awaiting review</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Processing</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
                      <p className="text-xs text-blue-600 mt-1">In progress</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                      <Activity className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                      <p className="text-xs text-green-600 mt-1">Ready to go</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.completed}</p>
                      <p className="text-xs text-purple-600 mt-1">Finished</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Rejected</p>
                      <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                      <p className="text-xs text-red-600 mt-1">Need attention</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
                      <XCircle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Available Services */}
        <Card className="mb-8 bg-white/60 backdrop-blur-sm border-white/20">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                <Plus className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Available Services</CardTitle>
                <CardDescription>Start a new service request with just one click</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div
                onClick={() => router.push('/party/umrah-visa')}
                className="group relative overflow-hidden border rounded-2xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 hover:scale-105"
              >

                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Umrah Visa</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Complete Umrah visa application with document verification, flight booking assistance, and accommodation arrangements
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>2-3 days processing</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>Group bookings</span>
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Apply for Umrah Visa
                  </Button>
                </div>
              </div>

              <div className="relative overflow-hidden border rounded-2xl p-6 bg-gradient-to-br from-gray-50 to-gray-100 opacity-75">
                <div className="absolute top-4 right-4">
                  <div className="h-12 w-12 rounded-xl bg-gray-300 flex items-center justify-center">
                    <Building className="h-6 w-6 text-gray-500" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-500 mb-2">More Services</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      Additional travel and visa services will be available soon. Stay tuned for updates!
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>Coming soon</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>In development</span>
                    </div>
                  </div>
                  <Button disabled variant="outline" className="w-full">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Coming Soon
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Umrah Visa Bookings */}
        <Card className="bg-white/60 backdrop-blur-sm border-white/20">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Your Umrah Visa Bookings</CardTitle>
                  <CardDescription>Track and manage your visa applications</CardDescription>
                </div>
              </div>
              
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3 min-w-0 lg:min-w-96">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/80 border-white/20"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40 bg-white/80 border-white/20">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-20 w-20 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6">
                  {bookings.length === 0 ? (
                    <FileText className="h-10 w-10 text-gray-400" />
                  ) : (
                    <Search className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {bookings.length === 0 ? 'No bookings yet' : 'No matching bookings'}
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {bookings.length === 0 
                    ? 'Get started by applying for your first Umrah visa using the service above'
                    : 'Try adjusting your search terms or filters to find what you\'re looking for'
                  }
                </p>
                {bookings.length === 0 && (
                  <Button 
                    onClick={() => router.push('/party/umrah-visa')}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Apply for Umrah Visa
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="group relative bg-white/90 backdrop-blur-sm border border-white/30 rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:border-indigo-200 aspect-[3.5/2] flex flex-col justify-between"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <Building className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-gray-900 truncate text-sm">
                            {booking.groupName || 'Umrah Booking'}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            {booking.groupNumber || 'No Group Number'}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>

                    {/* Essential Info */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 flex items-center">
                          <Hash className="h-3 w-3 mr-1" />
                          Group Number
                        </span>
                        <span className="font-medium text-gray-900 truncate ml-2">
                          {booking.groupNumber || 'Not Assigned'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          Passengers
                        </span>
                        <span className="font-medium text-gray-900">
                          {booking.passengerCount}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Created
                        </span>
                        <span className="font-medium text-gray-900 truncate ml-2">
                          {format(new Date(booking.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => handleViewBooking(booking.id)}
                      size="sm"
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 text-xs h-8"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
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

