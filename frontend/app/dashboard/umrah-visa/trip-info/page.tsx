'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Upload,
  Users,
  Menu,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { getUser, hasRole } from '@/lib/auth';
import { UmrahVisaBooking, UmrahVisaStatus } from '@/types';
import { umrahVisaAPI } from '@/lib/api';
import { UMRAH_VISA_STATUS_CONFIG } from '@/lib/constants';

export default function TripInfoPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingList, setBookingList] = useState<UmrahVisaBooking[]>([]);
  const [filteredData, setFilteredData] = useState<UmrahVisaBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [showUploadConfirmationDialog, setShowUploadConfirmationDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<UmrahVisaBooking | null>(null);
  
  // Form states
  const [confirmationImage, setConfirmationImage] = useState<File | null>(null);

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    fetchBookings();
  }, []); // Remove user and router from dependencies to prevent infinite loop

  useEffect(() => {
    filterData();
  }, [searchQuery, bookingList]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const response = await umrahVisaAPI.getBookings({ limit: 1000, status: 'group_assigned' });
      const data = response.data;
      
      // Filter only group_assigned bookings
      const bookingsData = data.bookings
        .filter((booking: any) => booking.status === 'group_assigned' && booking.accommodationType === 'iqama')
        .map((booking: any) => booking);

      setBookingList(bookingsData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    // No filtering needed - only group_assigned bookings are fetched
    setFilteredData(bookingList);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Action Handlers

  const handleUploadConfirmation = async () => {
    if (!confirmationImage || !selectedBooking) {
      toast.error('Please select an image');
      return;
    }

    if (!selectedBooking.id) return;

    try {
      // For testing: Use dummy image path instead of actual upload
      toast.info('Uploading confirmation image... (Test mode)');
      const imagePath = `/uploads/test-confirmation-${Date.now()}.jpg`;

      const token = localStorage.getItem('accessToken');
      
      // Update booking with confirmation
      const response = await umrahVisaAPI.uploadConfirmation(selectedBooking.id, imagePath);

      toast.success('Confirmation uploaded successfully! Status changed to Booking Success');
      setShowUploadConfirmationDialog(false);
      setConfirmationImage(null);
      setSelectedBooking(null);
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload confirmation');
    }
  };

  const renderActionButton = (booking: UmrahVisaBooking) => {
    // Only handle group_assigned status - this page only shows group_assigned bookings
        return (
          <div className="flex flex-col gap-1">
            <div className="text-xs text-gray-500 text-center">
              Downloads: {booking.documentsDownloadCount || 0}/1
            </div>
            <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setSelectedBooking(booking);
              setShowUploadConfirmationDialog(true);
            }}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <Upload className="h-3 w-3" />
            Upload Image
          </Button>
        </div>
      </div>
    );
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50/50">
        <div className="hidden lg:block">
          <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        </div>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar />
          </SheetContent>
        </Sheet>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading trip info...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
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
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Trip Info Management</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Track and manage all Umrah visa trip information
                </p>
              </div>
            </div>
            <Button 
              onClick={fetchBookings}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-8">
          <Card>
            <CardHeader>
              <CardTitle>Trip Information</CardTitle>
              <CardDescription>
                Showing {filteredData.length} of {bookingList.length} bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search by party name, group number, iqama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Visa Type</TableHead>
                      <TableHead className="w-[200px]">Group Details</TableHead>
                      <TableHead className="w-[180px]">Arrival Details</TableHead>
                      <TableHead className="w-[180px]">Return Details</TableHead>
                      <TableHead className="w-[220px]">Iqama Details</TableHead>
                      <TableHead className="w-[150px]">Updated By</TableHead>
                      <TableHead className="w-[280px]">Status & Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          {searchQuery 
                            ? 'No trips found matching your search' 
                            : 'No trip information available'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((booking) => {
                        const iqamaDetails = booking.sponsorIqamaDetails;
                        return (
                          <TableRow key={booking.id}>
                            {/* Visa Type */}
                            <TableCell>
                              <Badge variant={booking.visaType === 'group_visa' ? 'default' : 'secondary'} className="text-xs">
                                {booking.visaType === 'group_visa' ? 'Group Visa' : 'Individual Visa'}
                              </Badge>
                            </TableCell>
                            {/* Group Details */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-semibold text-gray-900">{booking.party?.partyName || 'N/A'}</div>
                                {booking.groupNumber ? (
                                  <>
                                    <div className="text-sm font-medium text-indigo-600">{booking.groupNumber}</div>
                                    <div className="text-xs text-gray-500">{booking.groupName}</div>
                                  </>
                                ) : (
                                  <div className="text-sm text-gray-400 italic">No group assigned</div>
                                )}
                              </div>
                            </TableCell>

                            {/* Arrival Details */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {booking.travelDetails?.arrivalDateTime ? formatDate(booking.travelDetails.arrivalDateTime) : 'N/A'}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {iqamaDetails?.sponserMobileNumber || 'N/A'}
                                </div>
                              </div>
                            </TableCell>

                            {/* Return Details */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {booking.travelDetails?.departureDateTime ? formatDate(booking.travelDetails.departureDateTime) : 'N/A'}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {iqamaDetails?.sponserMobileNumber || 'N/A'}
                                </div>
                              </div>
                            </TableCell>

                            {/* Iqama Details */}
                            <TableCell>
                              <div className="space-y-1 text-xs">
                                <div>
                                  <span className="text-gray-500">Number:</span>{' '}
                                  <span className="font-medium">{iqamaDetails?.iqamaNumber || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Holder:</span>{' '}
                                  <span className="font-medium">{iqamaDetails?.iqamaSponserName || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">DOB:</span>{' '}
                                  <span className="font-medium">
                                    {iqamaDetails?.sponserDob ? formatDate(iqamaDetails.sponserDob) : 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Phone:</span>{' '}
                                  <span className="font-medium">{iqamaDetails?.sponserMobileNumber || 'N/A'}</span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Updated By */}
                            <TableCell>
                              <div className="space-y-1 text-xs">
                                <div className="font-medium text-gray-900">
                                  {booking.lastUpdatedByUser?.name || 'System'}
                                </div>
                                <div className="text-gray-500">
                                  {booking.updatedAt ? formatDate(booking.updatedAt) : 'N/A'}
                                </div>
                              </div>
                            </TableCell>

                            {/* Status & Action */}
                            <TableCell>
                              <div className="flex items-center justify-between gap-3">
                                <Badge className={`${UMRAH_VISA_STATUS_CONFIG.group_assigned.color} flex items-center gap-1 text-xs whitespace-nowrap`}>
                                  <Users className="h-3 w-3" />
                                  {UMRAH_VISA_STATUS_CONFIG.group_assigned.label}
                                </Badge>
                                <div className="flex-shrink-0">
                                  {renderActionButton(booking)}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Confirmation Dialog */}
      <Dialog open={showUploadConfirmationDialog} onOpenChange={setShowUploadConfirmationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Confirmation Image</DialogTitle>
            <DialogDescription>
              Upload the booking confirmation image
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="confirmationImage">Confirmation Image</Label>
              <Input
                id="confirmationImage"
                type="file"
                accept="image/*"
                onChange={(e) => setConfirmationImage(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadConfirmationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadConfirmation}>
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
