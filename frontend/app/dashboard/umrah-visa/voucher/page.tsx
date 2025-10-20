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
  Ticket,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { getUser, hasRole } from '@/lib/auth';
import { TripInfo, UmrahVisaStatus } from '@/types';
import { umrahVisaAPI } from '@/lib/api';
import { UMRAH_VISA_STATUS_CONFIG } from '@/lib/constants';

export default function VoucherPage() {
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
      const token = localStorage.getItem('accessToken');
      
      const response = await umrahVisaAPI.getBookings({ limit: 1000 });

      if (response.error) throw new Error('Failed to fetch');
      const data = response.data;
      
      const tripInfoData = data.bookings
        .filter((booking: any) => booking.tripInfo)
        .map((booking: any) => ({
          ...booking.tripInfo,
          booking: { id: booking.id, passengerCount: booking.passengerCount, service: booking.service },
        }));

      setTripInfoList(tripInfoData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = tripInfoList.filter(trip => trip.status === 'voucher');

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

  const handleGenerateVoucher = async () => {
    if (!selectedTrip) return;

    try {
      toast.info('Generating voucher...');
      const token = localStorage.getItem('accessToken');
      const response = await umrahVisaAPI.generateVoucher(selectedTrip.bookingId);

      if (response.error) throw new Error('Failed');
      toast.success('Voucher generated successfully!');
      setShowGenerateDialog(false);
      setSelectedTrip(null);
      fetchTripInfo();
    } catch (error: any) {
      toast.error(error.message);
    }
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
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Book Voucher</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">Generate transport vouchers for bookings</p>
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
                <CardTitle>Book Voucher</CardTitle>
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
                          <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">No bookings found</TableCell>
                        </TableRow>
                      ) : (
                        filteredData.map((trip) => (
                          <TableRow key={trip.id}>
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
                            <TableCell>
                              <Button size="sm" onClick={() => { setSelectedTrip(trip); setShowGenerateDialog(true); }} className="flex items-center gap-1">
                                <Ticket className="h-3 w-3" />
                                Generate Voucher
                              </Button>
                            </TableCell>
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
            <DialogTitle>Generate Transport Voucher</DialogTitle>
            <DialogDescription>Generate voucher for this booking</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This will generate a transport voucher and move the booking to bill status.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
            <Button onClick={handleGenerateVoucher}>Generate Voucher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
