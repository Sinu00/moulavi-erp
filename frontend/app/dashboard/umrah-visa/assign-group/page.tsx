'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  Search,
  Download,
  Plus,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { getUser, hasRole } from '@/lib/auth';
import { UmrahVisaBooking, UmrahVisaStatus, Party } from '@/types';
import { umrahVisaAPI, partyAPI } from '@/lib/api';
import { UMRAH_VISA_STATUS_CONFIG } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AssignGroupPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingList, setBookingList] = useState<UmrahVisaBooking[]>([]);
  const [filteredData, setFilteredData] = useState<UmrahVisaBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddGroupDialog, setShowAddGroupDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<UmrahVisaBooking | null>(null);
  const [groupNumber, setGroupNumber] = useState('');
  const [groupName, setGroupName] = useState('');
  const [umrahVisaProviderId, setUmrahVisaProviderId] = useState('');
  const [umrahVisaProviders, setUmrahVisaProviders] = useState<Party[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
  }

  useEffect(() => {
    fetchBookings();
    loadUmrahVisaProviders();
  }, []);

  const loadUmrahVisaProviders = async () => {
    setLoadingProviders(true);
    try {
      const response = await partyAPI.getAll({ 
        supplier_service_type: 'umrah_service',
        limit: 1000 
      });
      setUmrahVisaProviders(response.data.parties || []);
    } catch (error) {
      console.error('Error loading umrah visa providers:', error);
      setUmrahVisaProviders([]);
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    filterData();
  }, [searchQuery, bookingList]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const response = await umrahVisaAPI.getBookings({ limit: 1000 });
      const data = response.data;
      
      const bookingsData = data.bookings
        .filter((booking: any) => booking.status === 'pending' || booking.status === 'documents_downloaded')
        .map((booking: any) => booking);

      setBookingList(bookingsData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = bookingList.filter(booking => 
      booking.status === 'pending' || booking.status === 'documents_downloaded'
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.party?.partyName?.toLowerCase().includes(query) ||
        booking.groupNumber?.toLowerCase().includes(query) ||
        booking.groupName?.toLowerCase().includes(query)
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

  const handleDownloadDocuments = async (booking: UmrahVisaBooking) => {
    if (!booking.id) return;
    try {
      toast.info('Downloading zip file...');
      
      // First, download the actual zip file
      const zipResponse = await umrahVisaAPI.downloadBookingZip(booking.id);
      
      if (zipResponse.data.downloadUrl) {
        // If S3, use presigned URL to download
        const link = document.createElement('a');
        link.href = zipResponse.data.downloadUrl;
        link.download = zipResponse.data.fileName || 'documents.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // If local file, the response should be a blob
        // This case is handled by the backend directly serving the file
        toast.error('Download URL not available');
        return;
      }
      
      // Then track the download (update status)
      try {
        await umrahVisaAPI.downloadDocuments(booking.id);
      } catch (trackError: any) {
        // If tracking fails, still show success for the download
        console.warn('Failed to track download:', trackError);
      }
      
      toast.success('Documents downloaded successfully!');
      fetchBookings();
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to download documents');
    }
  };

  const handleAddGroupData = async () => {
    if (!selectedBooking || !groupNumber || !groupName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!selectedBooking.id) return;

    try {
      const payload: any = {
        groupNumber, 
        groupName,
      };
      
      // Only include umrahVisaProviderId if it has a value
      if (umrahVisaProviderId && umrahVisaProviderId.trim()) {
        payload.umrahVisaProviderId = umrahVisaProviderId;
      }
      
      const response = await umrahVisaAPI.addGroupData(selectedBooking.id, payload);
      toast.success('Group data added successfully');
      setShowAddGroupDialog(false);
      setGroupNumber('');
      setGroupName('');
      setUmrahVisaProviderId('');
      setSelectedBooking(null);
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add group data');
    }
  };

  const renderActionButton = (booking: UmrahVisaBooking) => {
    if (booking.status === 'pending') {
      return (
        <Button size="sm" onClick={() => handleDownloadDocuments(booking)} className="flex items-center gap-1">
          <Download className="h-3 w-3" />
          Download Docs
        </Button>
      );
    } else if (booking.status === 'documents_downloaded') {
      return (
        <Button size="sm" onClick={() => { 
          setSelectedBooking(booking); 
          setGroupNumber(booking.groupNumber || '');
          setGroupName(booking.groupName || '');
          setUmrahVisaProviderId(booking.umrahVisaProviderId || '');
          setShowAddGroupDialog(true); 
        }} className="flex items-center gap-1">
          <Plus className="h-3 w-3" />
          Assign Group
        </Button>
      );
    }
    return null;
  };

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

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Assign Group</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">Manage pending and documents downloaded bookings</p>
              </div>
            </div>
            <Button onClick={fetchBookings} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-4 lg:p-8">
            <Card>
              <CardHeader>
                <CardTitle>Assign Group</CardTitle>
                <CardDescription>Showing {filteredData.length} of {bookingList.length} bookings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input placeholder="Search by party name, group number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[130px]">Visa Type</TableHead>
                        <TableHead className="w-[200px]">Group Details</TableHead>
                        <TableHead className="w-[180px]">Party Name</TableHead>
                        <TableHead className="w-[150px]">Arrival Date</TableHead>
                        <TableHead className="w-[200px]">Downloaded By</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead className="w-[200px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">No bookings found</TableCell>
                        </TableRow>
                      ) : (
                        filteredData.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell>
                              <Badge variant={booking.visaType === 'group_visa' ? 'default' : 'secondary'} className="text-xs">
                                {booking.visaType === 'group_visa' ? 'Group Visa' : 'Individual Visa'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-semibold">{booking.groupNumber || 'N/A'}</div>
                                <div className="text-xs text-gray-500">{booking.groupName || 'No group'}</div>
                              </div>
                            </TableCell>
                            <TableCell><div className="font-medium">{booking.party?.partyName || 'N/A'}</div></TableCell>
                            <TableCell><div className="text-sm">{booking.travelDetails?.arrivalDateTime ? formatDate(booking.travelDetails.arrivalDateTime) : 'N/A'}</div></TableCell>
                            <TableCell>
                              {booking.documentsDownloadedByUser ? (
                                <div className="space-y-1 text-xs">
                                  <div className="font-medium text-gray-900">{booking.documentsDownloadedByUser.name}</div>
                                  <div className="text-gray-400">Download #{booking.documentsDownloadCount || 0}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">Not downloaded yet</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${UMRAH_VISA_STATUS_CONFIG[booking.status || 'pending'].color} text-xs`}>
                                {UMRAH_VISA_STATUS_CONFIG[booking.status || 'pending'].label}
                              </Badge>
                            </TableCell>
                            <TableCell>{renderActionButton(booking)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showAddGroupDialog} onOpenChange={setShowAddGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Group Details</DialogTitle>
            <DialogDescription>Assign group number, name, and umrah visa providing company to this booking</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="groupNumber">Group Number *</Label>
              <Input id="groupNumber" placeholder="e.g., GRP-2024-001" value={groupNumber} onChange={(e) => setGroupNumber(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="groupName">Group Name *</Label>
              <Input id="groupName" placeholder="e.g., Ramadan Group 2024" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="umrahVisaProviderId">Umrah Visa Providing Company</Label>
              <Select
                value={umrahVisaProviderId || undefined}
                onValueChange={(value) => setUmrahVisaProviderId(value || '')}
                disabled={loadingProviders}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingProviders ? "Loading..." : "Select umrah visa provider (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  {umrahVisaProviders.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.partyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {umrahVisaProviderId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-6 text-xs"
                  onClick={() => setUmrahVisaProviderId('')}
                >
                  Clear selection
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddGroupDialog(false);
              setGroupNumber('');
              setGroupName('');
              setUmrahVisaProviderId('');
            }}>Cancel</Button>
            <Button onClick={handleAddGroupData}>Assign Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
