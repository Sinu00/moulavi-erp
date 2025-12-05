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
  Search, 
  Users,
  Menu,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { getUser, hasRole } from '@/lib/auth';
import { UmrahVisaBooking, UmrahVisaStatus } from '@/types';
import { umrahVisaAPI, uploadAPI } from '@/lib/api';
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
  const [activeTab, setActiveTab] = useState<'iqama' | 'hotel'>('iqama');

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    fetchBookings();
  }, []); // Remove user and router from dependencies to prevent infinite loop

  useEffect(() => {
    filterData();
  }, [searchQuery, bookingList, activeTab]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const response = await umrahVisaAPI.getBookings({ limit: 1000, status: 'group_assigned' });
      const data = response.data;
      
      // Filter only group_assigned bookings (both iqama and hotel)
      const bookingsData = data.bookings
        .filter((booking: any) => booking.status === 'group_assigned')
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
    let filtered = bookingList;

    // Filter by accommodation type based on active tab
    if (activeTab === 'iqama') {
      filtered = filtered.filter(booking => booking.accommodationType === 'iqama');
    } else if (activeTab === 'hotel') {
      filtered = filtered.filter(booking => booking.accommodationType === 'hotel');
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.party?.partyName?.toLowerCase().includes(query) ||
        booking.groupNumber?.toLowerCase().includes(query) ||
        booking.groupName?.toLowerCase().includes(query) ||
        booking.sponsorIqamaDetails?.iqamaNumber?.toLowerCase().includes(query)
      );
    }

    setFilteredData(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Action Handlers

  const handleUploadConfirmation = async (booking: UmrahVisaBooking, file: File) => {
    if (!file || !booking.id) {
      toast.error('Please select an image');
      return;
    }

    try {
      toast.info('Uploading confirmation image...');
      
      // First, upload the actual file
      const uploadResponse = await uploadAPI.uploadDocument(
        booking.id,
        file,
        'confirmation_image'
      );
      
      // Get the file path from the upload response
      const imagePath = uploadResponse.data.document.filePath;
      
      // Then update booking with confirmation image path
      const response = await umrahVisaAPI.uploadConfirmation(booking.id, imagePath);

      toast.success('Confirmation uploaded successfully! Status changed to Booking Success');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload confirmation');
    }
  };

  const handleMarkReadyForVoucher = async (booking: UmrahVisaBooking) => {
    if (!booking.id) return;

    try {
      toast.info('Marking booking as ready for voucher...');
      const response = await umrahVisaAPI.markReadyForVoucher(booking.id);
      toast.success('Booking marked as ready for voucher generation');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark booking as ready');
    }
  };

  const renderActionButton = (booking: UmrahVisaBooking) => {
    if (booking.accommodationType === 'hotel') {
      // Hotel bookings: Show Done button
      return (
        <Button
          size="sm"
          onClick={() => handleMarkReadyForVoucher(booking)}
          className="flex items-center gap-1 whitespace-nowrap"
        >
          Done
        </Button>
      );
    }
    return null;
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
              {/* Tabs for Accommodation Type */}
              <div className="flex space-x-2 border-b">
                <button
                  onClick={() => setActiveTab('iqama')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'iqama'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Iqama
                </button>
                <button
                  onClick={() => setActiveTab('hotel')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'hotel'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Hotel
                </button>
              </div>

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
                      <TableHead className="w-[220px]">{activeTab === 'iqama' ? 'Iqama Details' : 'Hotel Details'}</TableHead>
                      <TableHead className="w-[150px]">Updated By</TableHead>
                      {activeTab === 'iqama' && (
                        <TableHead className="w-[180px]">Upload Image</TableHead>
                      )}
                      <TableHead className="w-[280px]">Status & Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={activeTab === 'iqama' ? 8 : 7} className="text-center py-8 text-gray-500">
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
                              <div className="flex flex-col gap-1">
                                <Badge variant={booking.visaType === 'group_visa' ? 'default' : 'secondary'} className="text-xs">
                                  {booking.visaType === 'group_visa' ? 'Group Visa' : 'Individual Visa'}
                                </Badge>
                                {booking.hasMultipleGroup && (
                                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                                    Add to Existing
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            {/* Group Details */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-semibold text-gray-900">{booking.party?.partyName || 'N/A'}</div>
                                {booking.groupNumber ? (
                                  <>
                                    {(() => {
                                      // Parse multipleGroupDetails if available
                                      let groups: Array<{ groupNumber?: string; groupName?: string }> = [];
                                      if (booking.hasMultipleGroup && booking.multipleGroupDetails) {
                                        try {
                                          if (Array.isArray(booking.multipleGroupDetails)) {
                                            groups = booking.multipleGroupDetails as Array<{ groupNumber?: string; groupName?: string }>;
                                          }
                                        } catch (e) {
                                          console.error('Error parsing multipleGroupDetails:', e);
                                        }
                                      }
                                      
                                      // If we have parsed groups, display them individually
                                      if (groups.length > 0) {
                                        const groupNumbers = groups.map(g => g.groupNumber).filter(Boolean);
                                        const groupNames = groups.map(g => g.groupName).filter(Boolean);
                                        const lastIndex = groups.length - 1;
                                        
                                        return (
                                          <>
                                            <div className="text-sm font-medium">
                                              {groupNumbers.map((num, idx) => (
                                                <span key={idx} className={idx === lastIndex ? 'text-orange-600' : 'text-indigo-600'}>
                                                  {num}{idx < groupNumbers.length - 1 ? ', ' : ''}
                                                </span>
                                              ))}
                                            </div>
                                            <div className="text-xs">
                                              {groupNames.map((name, idx) => (
                                                <span key={idx} className={idx === lastIndex ? 'text-orange-600' : 'text-gray-500'}>
                                                  {name}{idx < groupNames.length - 1 ? ', ' : ''}
                                                </span>
                                              ))}
                                            </div>
                                          </>
                                        );
                                      } else {
                                        // Fallback to original display
                                        return (
                                          <>
                                            <div className="text-sm font-medium text-indigo-600">{booking.groupNumber}</div>
                                            <div className="text-xs text-gray-500">{booking.groupName}</div>
                                          </>
                                        );
                                      }
                                    })()}
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
                                {activeTab === 'iqama' && (
                                  <div className="text-xs text-gray-600">
                                    {iqamaDetails?.sponserMobileNumber || 'N/A'}
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Return Details */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {booking.travelDetails?.departureDateTime ? formatDate(booking.travelDetails.departureDateTime) : 'N/A'}
                                </div>
                                {activeTab === 'iqama' && (
                                  <div className="text-xs text-gray-600">
                                    {iqamaDetails?.sponserMobileNumber || 'N/A'}
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Accommodation Details */}
                            <TableCell>
                              {activeTab === 'iqama' ? (
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
                              ) : (
                                <div className="space-y-1 text-xs">
                                  <div>
                                    <span className="text-gray-500">Hotels:</span>{' '}
                                    <span className="font-medium">
                                      {booking.hotelBookings?.length || 0} hotel(s)
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Passengers:</span>{' '}
                                    <span className="font-medium">{booking.passengerCount || 'N/A'}</span>
                                  </div>
                                  {booking.umrahVisaProvider && (
                                    <div>
                                      <span className="text-gray-500">Provider:</span>{' '}
                                      <span className="font-medium">{booking.umrahVisaProvider.partyName}</span>
                                    </div>
                                  )}
                                </div>
                              )}
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

                            {/* Upload Image Column (only for iqama tab) */}
                            {activeTab === 'iqama' && (
                              <TableCell>
                                <div className="space-y-2">
                                  <div className="text-xs text-gray-500 text-center">
                                    Downloads: {booking.documentsDownloadCount || 0}/1
                                  </div>
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleUploadConfirmation(booking, file);
                                        // Reset input after upload
                                        e.target.value = '';
                                      }
                                    }}
                                    className="text-xs cursor-pointer"
                                  />
                                </div>
                              </TableCell>
                            )}

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
    </div>
  );
}
