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
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Download, 
  Upload,
  Users,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Menu,
  RefreshCw,
  AlertCircle,
  Plus,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { getUser, hasRole } from '@/lib/auth';
import { TripInfo, UmrahVisaStatus } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Status configuration
const statusConfig: Record<UmrahVisaStatus, { label: string; color: string; icon: any }> = {
  group_processing: {
    label: 'Group Processing',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: Clock,
  },
  group_assigned: {
    label: 'Group Assigned',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Users,
  },
  documents_downloaded: {
    label: 'Documents Downloaded',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: Download,
  },
  booking_success: {
    label: 'Booking Success',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: XCircle,
  },
};

export default function TripInfoPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tripInfoList, setTripInfoList] = useState<TripInfo[]>([]);
  const [filteredData, setFilteredData] = useState<TripInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<UmrahVisaStatus | 'all'>('all');
  
  // Dialog states
  const [showAddGroupDialog, setShowAddGroupDialog] = useState(false);
  const [showUploadConfirmationDialog, setShowUploadConfirmationDialog] = useState(false);
  const [showReDownloadDialog, setShowReDownloadDialog] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripInfo | null>(null);
  
  // Form states
  const [groupNumber, setGroupNumber] = useState('');
  const [groupName, setGroupName] = useState('');
  const [confirmationImage, setConfirmationImage] = useState<File | null>(null);
  const [reDownloadReason, setReDownloadReason] = useState('');

  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }
    fetchTripInfo();
  }, []); // Remove user and router from dependencies to prevent infinite loop

  useEffect(() => {
    filterData();
  }, [searchQuery, selectedStatus, tripInfoList]);

  const fetchTripInfo = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_URL}/umrah-visa/bookings?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch trip info');

      const data = await response.json();
      
      // Extract trip info from bookings
      const tripInfoData = data.bookings
        .filter((booking: any) => booking.tripInfo)
        .map((booking: any) => ({
          ...booking.tripInfo,
          booking: {
            id: booking.id,
            passengerCount: booking.passengerCount,
            service: booking.service,
          },
        }));

      setTripInfoList(tripInfoData);
    } catch (error) {
      console.error('Error fetching trip info:', error);
      toast.error('Failed to load trip info');
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...tripInfoList];

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(trip => trip.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(trip =>
        trip.partyName?.toLowerCase().includes(query) ||
        trip.groupNumber?.toLowerCase().includes(query) ||
        trip.groupName?.toLowerCase().includes(query) ||
        trip.iqamaNumber?.toLowerCase().includes(query) ||
        trip.iqamaHolderName?.toLowerCase().includes(query)
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

  const getStatusCounts = () => {
    return {
      all: tripInfoList.length,
      group_processing: tripInfoList.filter(t => t.status === 'group_processing').length,
      group_assigned: tripInfoList.filter(t => t.status === 'group_assigned').length,
      documents_downloaded: tripInfoList.filter(t => t.status === 'documents_downloaded').length,
      booking_success: tripInfoList.filter(t => t.status === 'booking_success').length,
      cancelled: tripInfoList.filter(t => t.status === 'cancelled').length,
    };
  };

  const statusCounts = getStatusCounts();

  // Action Handlers
  const handleAddGroupData = async () => {
    if (!selectedTrip || !groupNumber || !groupName) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/umrah-visa/${selectedTrip.bookingId}/add-group-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupNumber, groupName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add group data');
      }

      toast.success('Group data added successfully');
      setShowAddGroupDialog(false);
      setGroupNumber('');
      setGroupName('');
      setSelectedTrip(null);
      fetchTripInfo();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDownloadDocuments = async (trip: TripInfo) => {
    try {
      // Show downloading toast for testing
      toast.info('Downloading documents... (Test mode)');
      
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/umrah-visa/${trip.bookingId}/download-documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download documents');
      }

      const data = await response.json();
      toast.success('Documents downloaded successfully! Status changed to Documents Downloaded');
      
      // Refresh the data to show updated status
      fetchTripInfo();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReDownloadRequest = async () => {
    if (!reDownloadReason.trim()) {
      toast.error('Please provide a reason for re-download');
      return;
    }

    // For now, just log and close
    // In production, you'd save this request for admin approval
    console.log('Re-download request:', {
      tripId: selectedTrip?.id,
      reason: reDownloadReason,
      requestedBy: user?.name,
    });

    toast.info('Re-download request submitted for admin approval');
    setShowReDownloadDialog(false);
    setReDownloadReason('');
    setSelectedTrip(null);
  };

  const handleUploadConfirmation = async () => {
    if (!confirmationImage || !selectedTrip) {
      toast.error('Please select an image');
      return;
    }

    try {
      // For testing: Use dummy image path instead of actual upload
      toast.info('Uploading confirmation image... (Test mode)');
      const imagePath = `/uploads/test-confirmation-${Date.now()}.jpg`;

      const token = localStorage.getItem('accessToken');
      
      // Update trip info with confirmation
      const response = await fetch(`${API_URL}/umrah-visa/${selectedTrip.bookingId}/upload-confirmation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmationImagePath: imagePath }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload confirmation');
      }

      toast.success('Confirmation uploaded successfully! Status changed to Booking Success');
      setShowUploadConfirmationDialog(false);
      setConfirmationImage(null);
      setSelectedTrip(null);
      fetchTripInfo();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const renderActionButton = (trip: TripInfo) => {
    switch (trip.status) {
      case 'group_processing':
        return (
          <Button
            size="sm"
            onClick={() => {
              setSelectedTrip(trip);
              setShowAddGroupDialog(true);
            }}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <Plus className="h-3 w-3" />
            Update Group Details
          </Button>
        );

      case 'group_assigned':
        return (
          <div className="flex flex-col gap-1">
            <div className="text-xs text-gray-500 text-center">
              Downloads: {trip.documentsDownloadCount}/1
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleDownloadDocuments(trip)}
                className="flex items-center gap-1 whitespace-nowrap"
                disabled={trip.documentsDownloadCount > 0}
              >
                <Download className="h-3 w-3" />
                {trip.documentsDownloadCount > 0 ? 'Downloaded' : 'Download'}
              </Button>
              {trip.documentsDownloadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedTrip(trip);
                    setShowReDownloadDialog(true);
                  }}
                  title="Request re-download"
                  className="h-8 px-2"
                >
                  <AlertCircle className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        );

      case 'documents_downloaded':
        return (
          <Button
            size="sm"
            onClick={() => {
              setSelectedTrip(trip);
              setShowUploadConfirmationDialog(true);
            }}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <Upload className="h-3 w-3" />
            Upload Confirmation
          </Button>
        );

      case 'booking_success':
        return (
          <Button
            size="sm"
            disabled
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <CheckCircle className="h-3 w-3" />
            Completed
          </Button>
        );

      case 'cancelled':
        return (
          <Badge variant="outline" className="text-gray-400 whitespace-nowrap">
            No actions
          </Badge>
        );

      default:
        return null;
    }
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
              onClick={fetchTripInfo}
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
                Showing {filteredData.length} of {tripInfoList.length} trips
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

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-2 pb-4 border-b">
                <Button
                  variant={selectedStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('all')}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  All ({statusCounts.all})
                </Button>
                
                {(Object.keys(statusConfig) as UmrahVisaStatus[]).map((status) => {
                  const config = statusConfig[status];
                  const Icon = config.icon;
                  const count = statusCounts[status];
                  
                  return (
                    <Button
                      key={status}
                      variant={selectedStatus === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedStatus(status)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden md:inline">{config.label}</span>
                      <span className="md:hidden">{config.label.split(' ')[0]}</span>
                      ({count})
                    </Button>
                  );
                })}
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {searchQuery || selectedStatus !== 'all' 
                            ? 'No trips found matching your filters' 
                            : 'No trip information available'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((trip) => {
                        const config = statusConfig[trip.status];
                        const Icon = config.icon;
                        
                        return (
                          <TableRow key={trip.id}>
                            {/* Group Details */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-semibold text-gray-900">{trip.partyName}</div>
                                {trip.groupNumber ? (
                                  <>
                                    <div className="text-sm font-medium text-indigo-600">{trip.groupNumber}</div>
                                    <div className="text-xs text-gray-500">{trip.groupName}</div>
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
                                  {formatDate(trip.arrivalDate)}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {trip.booking?.service?.party?.contactNumber || 'N/A'}
                                </div>
                              </div>
                            </TableCell>

                            {/* Return Details */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatDate(trip.departureDate)}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {trip.booking?.service?.party?.contactNumber || 'N/A'}
                                </div>
                              </div>
                            </TableCell>

                            {/* Iqama Details */}
                            <TableCell>
                              <div className="space-y-1 text-xs">
                                <div>
                                  <span className="text-gray-500">Number:</span>{' '}
                                  <span className="font-medium">{trip.iqamaNumber || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Holder:</span>{' '}
                                  <span className="font-medium">{trip.iqamaHolderName || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">DOB:</span>{' '}
                                  <span className="font-medium">
                                    {trip.iqamaHolderDob ? formatDate(trip.iqamaHolderDob) : 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Phone:</span>{' '}
                                  <span className="font-medium">{trip.iqamaHolderMobile || 'N/A'}</span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Updated By */}
                            <TableCell>
                              <div className="space-y-1 text-xs">
                                <div className="font-medium text-gray-900">
                                  {trip.updatedByUser?.name || 'System'}
                                </div>
                                <div className="text-gray-500">
                                  {formatDate(trip.updatedAt)}
                                </div>
                              </div>
                            </TableCell>

                            {/* Status & Action */}
                            <TableCell>
                              <div className="flex items-center justify-between gap-3">
                                <Badge className={`${config.color} flex items-center gap-1 text-xs whitespace-nowrap`}>
                                  <Icon className="h-3 w-3" />
                                  {config.label}
                                </Badge>
                                <div className="flex-shrink-0">
                                  {renderActionButton(trip)}
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

      {/* Add Group Data Dialog */}
      <Dialog open={showAddGroupDialog} onOpenChange={setShowAddGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Group Details</DialogTitle>
            <DialogDescription>
              Assign group number and name to this trip. This will change the status to "Group Assigned".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="groupNumber">Group Number</Label>
              <Input
                id="groupNumber"
                placeholder="e.g., GRP-2024-001"
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="e.g., Ramadan Group 2024"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGroupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddGroupData}>
              Save Group Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Re-Download Request Dialog */}
      <Dialog open={showReDownloadDialog} onOpenChange={setShowReDownloadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Re-Download</DialogTitle>
            <DialogDescription>
              Documents have already been downloaded. Please provide a reason for re-download request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason for Re-Download</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Documents were corrupted, need updated version..."
                value={reDownloadReason}
                onChange={(e) => setReDownloadReason(e.target.value)}
                rows={4}
              />
            </div>
            {selectedTrip && (
              <div className="text-sm text-gray-600">
                <div>Last downloaded: {selectedTrip.documentsDownloadedAt ? formatDate(selectedTrip.documentsDownloadedAt) : 'N/A'}</div>
                <div>Downloaded by: {selectedTrip.documentsDownloadedByUser?.name || 'N/A'}</div>
                <div>Download count: {selectedTrip.documentsDownloadCount} times</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReDownloadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReDownloadRequest}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
