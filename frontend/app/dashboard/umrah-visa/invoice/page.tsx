'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
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
  Receipt,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { getUser, hasRole } from '@/lib/auth';
import { TripInfo, UmrahVisaStatus } from '@/types';
import { umrahVisaAPI } from '@/lib/api';
import { UMRAH_VISA_STATUS_CONFIG } from '@/lib/constants';

export default function InvoicePage() {
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tripInfoList, setTripInfoList] = useState<TripInfo[]>([]);
  const [filteredData, setFilteredData] = useState<TripInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripInfo | null>(null);

  if (!user || !hasRole(['admin', 'staff'])) {
    return null;
  }

  useEffect(() => {
    fetchTripInfo();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchQuery, tripInfoList]);

  const fetchTripInfo = async () => {
    try {
      setIsLoading(true);
      const response = await umrahVisaAPI.getBookings({ limit: 1000 });
      const data = response.data;
      
      const tripInfoData = data.bookings
        .filter((booking: any) => booking.tripInfo)
        .map((booking: any) => ({
          ...booking.tripInfo,
          visaType: booking.visaType,
          booking: { id: booking.id, passengerCount: booking.passengerCount, service: booking.service },
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
    let filtered = tripInfoList.filter(trip => 
      trip.status === 'bill' || trip.status === 'booking_success'
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(trip =>
        trip.partyName?.toLowerCase().includes(query) ||
        trip.groupNumber?.toLowerCase().includes(query) ||
        trip.groupName?.toLowerCase().includes(query)
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

  const handleGenerateBill = async () => {
    if (!selectedTrip) return;
    try {
      toast.info('Generating bill... (Functionality coming soon)');
      setShowGenerateDialog(false);
      setSelectedTrip(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const renderActionButton = (trip: TripInfo) => {
    if (trip.status === 'bill') {
      return (
        <Button size="sm" onClick={() => { setSelectedTrip(trip); setShowGenerateDialog(true); }} className="flex items-center gap-1">
          <Receipt className="h-3 w-3" />
          Generate Bill
        </Button>
      );
    } else if (trip.status === 'booking_success') {
      return (
        <Badge variant="outline" className="whitespace-nowrap">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Invoice</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">Manage billing and completion status</p>
              </div>
            </div>
            <Button onClick={fetchTripInfo} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-4 lg:p-8">
            <Card>
              <CardHeader>
                <CardTitle>Invoice</CardTitle>
                <CardDescription>Showing {filteredData.length} of {tripInfoList.length} bookings</CardDescription>
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
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead className="w-[200px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">No bookings found</TableCell>
                        </TableRow>
                      ) : (
                        filteredData.map((trip) => (
                          <TableRow key={trip.id}>
                            <TableCell>
                              <Badge variant={trip.visaType === 'group_visa' ? 'default' : 'secondary'} className="text-xs">
                                {trip.visaType === 'group_visa' ? 'Group Visa' : 'Individual Visa'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-semibold">{trip.groupNumber || 'N/A'}</div>
                                <div className="text-xs text-gray-500">{trip.groupName || 'No group'}</div>
                              </div>
                            </TableCell>
                            <TableCell><div className="font-medium">{trip.partyName}</div></TableCell>
                            <TableCell><div className="text-sm">{formatDate(trip.arrivalDate)}</div></TableCell>
                            <TableCell>
                              <Badge className={`${UMRAH_VISA_STATUS_CONFIG[trip.status].color} text-xs`}>
                                {UMRAH_VISA_STATUS_CONFIG[trip.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell>{renderActionButton(trip)}</TableCell>
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

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Bill</DialogTitle>
            <DialogDescription>Generate bill for this booking</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This functionality will be implemented soon.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
            <Button onClick={handleGenerateBill} disabled>Generate Bill (Coming Soon)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
