'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { umrahVisaAPI } from '@/lib/api';
import { generateVoucherPDF } from '@/lib/pdf/voucherPdfGenerator';

interface VoucherPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  onSuccess: () => void;
}

interface HotelSchedule {
  number: number;
  location: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  days: number;
}

interface MovementDetail {
  sr: number;
  route: string;
  date: string;
  time: string;
  fromLocation: string;
  fromLocationId?: string;
  toLocation: string;
  toLocationId?: string;
}

interface FlightDetail {
  type: 'AA' | 'AD';
  date: string;
  carrier: string;
  number: string;
  from: string;
  to: string;
  etd: string;
  eta: string;
}

export function VoucherPreviewDialog({
  open,
  onOpenChange,
  bookingId,
  onSuccess,
}: VoucherPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voucherData, setVoucherData] = useState({
    reservationDate: '',
    guestName: '',
    guestMobile: '',
    groupCode: '',
    paxCount: 0,
    hotelSchedules: [] as HotelSchedule[],
    movementDetails: [] as MovementDetail[],
    flightDetails: [] as FlightDetail[],
  });

  useEffect(() => {
    if (open && bookingId) {
      loadVoucherData();
    }
  }, [open, bookingId]);

  const loadVoucherData = async () => {
    try {
      setLoading(true);
      const response = await umrahVisaAPI.getVoucherData(bookingId);
      const data = response.data;
      
      console.log('Voucher data loaded:', data); // Debug log
      
      setVoucherData({
        reservationDate: data.reservationDate ? new Date(data.reservationDate).toISOString().split('T')[0] : '',
        guestName: data.guestName || '',
        guestMobile: data.guestMobile || '',
        groupCode: data.groupCode || '',
        paxCount: data.paxCount || 0,
        hotelSchedules: data.hotelSchedules || [],
        movementDetails: (data.movementDetails || []).map((m: any, idx: number) => ({
          ...m,
          sr: idx + 1,
          date: m.date ? new Date(m.date).toISOString().split('T')[0] : '',
          time: m.time ? (typeof m.time === 'string' && m.time.includes('T') ? m.time.split('T')[1].slice(0, 5) : m.time.slice(0, 5)) : '',
        })),
        flightDetails: data.flightDetails || [],
      });
    } catch (error: any) {
      console.error('Error loading voucher data:', error);
      toast.error(error.message || 'Failed to load voucher data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    if (timeString.includes('T')) {
      return timeString.split('T')[1].slice(0, 5);
    }
    return timeString.slice(0, 5);
  };

  const calculateDays = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const diffTime = Math.abs(outDate.getTime() - inDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleHotelScheduleChange = (index: number, field: keyof HotelSchedule, value: any) => {
    const updated = [...voucherData.hotelSchedules];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'checkIn' || field === 'checkOut') {
      updated[index].days = calculateDays(updated[index].checkIn, updated[index].checkOut);
    }
    
    setVoucherData({ ...voucherData, hotelSchedules: updated });
  };

  const handleMovementChange = (index: number, field: keyof MovementDetail, value: any) => {
    const updated = [...voucherData.movementDetails];
    updated[index] = { ...updated[index], [field]: value };
    setVoucherData({ ...voucherData, movementDetails: updated });
  };

  const handleFlightChange = (index: number, field: keyof FlightDetail, value: any) => {
    const updated = [...voucherData.flightDetails];
    updated[index] = { ...updated[index], [field]: value };
    setVoucherData({ ...voucherData, flightDetails: updated });
  };

  const addMovement = () => {
    const newMovement: MovementDetail = {
      sr: voucherData.movementDetails.length + 1,
      route: '',
      date: '',
      time: '',
      fromLocation: '',
      toLocation: '',
    };
    setVoucherData({
      ...voucherData,
      movementDetails: [...voucherData.movementDetails, newMovement],
    });
  };

  const removeMovement = (index: number) => {
    const updated = voucherData.movementDetails.filter((_, i) => i !== index);
    // Re-number
    updated.forEach((m, idx) => { m.sr = idx + 1; });
    setVoucherData({ ...voucherData, movementDetails: updated });
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Format data for submission
      const submissionData = {
        ...voucherData,
        hotelSchedules: voucherData.hotelSchedules.map((hs, idx) => ({
          ...hs,
          number: idx + 1,
        })),
        movementDetails: voucherData.movementDetails.map((md) => ({
          ...md,
          // Convert date and time strings back to proper format
          date: md.date,
          time: md.time,
        })),
      };

      const response = await umrahVisaAPI.generateVoucher(bookingId, submissionData);
      const generatedVoucher = response.data?.data?.voucher || response.data?.voucher || response.data;
      
      toast.success('Voucher generated successfully!');
      
      // Generate and download PDF immediately after voucher is saved
      try {
        // Use the route numbers that were auto-generated by backend
        const movementDetailsWithRoutes = generatedVoucher?.movementDetails || submissionData.movementDetails || [];
        
        generateVoucherPDF({
          voucherNumber: generatedVoucher?.voucherNumber || '001',
          reservationDate: submissionData.reservationDate || generatedVoucher?.reservationDate,
          guestName: submissionData.guestName || generatedVoucher?.guestName,
          guestMobile: submissionData.guestMobile || generatedVoucher?.guestMobile,
          groupCode: submissionData.groupCode || generatedVoucher?.groupCode,
          paxCount: submissionData.paxCount || generatedVoucher?.paxCount,
          hotelSchedules: submissionData.hotelSchedules || generatedVoucher?.hotelSchedules || [],
          movementDetails: movementDetailsWithRoutes,
          flightDetails: submissionData.flightDetails || generatedVoucher?.flightDetails || [],
        });
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        toast.error('Voucher saved but PDF generation failed');
      }
      
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate voucher');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Voucher Preview & Generation</DialogTitle>
            <DialogDescription>Loading voucher data...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <p>Loading voucher data...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Voucher Preview & Generation</DialogTitle>
          <DialogDescription>
            Review and edit voucher details before generating
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 overflow-y-auto">
          <div className="space-y-6 pb-4">
            {/* Reservation Summary */}
            <div className="space-y-4 p-4 border rounded-lg bg-white">
              <h3 className="font-semibold text-lg">Reservation Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reservation Date</Label>
                  <Input
                    type="date"
                    value={voucherData.reservationDate}
                    onChange={(e) => setVoucherData({ ...voucherData, reservationDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Guest Name</Label>
                  <Input
                    value={voucherData.guestName}
                    onChange={(e) => setVoucherData({ ...voucherData, guestName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Guest Mobile</Label>
                  <Input
                    value={voucherData.guestMobile}
                    onChange={(e) => setVoucherData({ ...voucherData, guestMobile: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Group Code</Label>
                  <Input
                    value={voucherData.groupCode}
                    onChange={(e) => setVoucherData({ ...voucherData, groupCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pax Count</Label>
                  <Input
                    type="number"
                    value={voucherData.paxCount}
                    onChange={(e) => setVoucherData({ ...voucherData, paxCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* Hotel Schedules */}
            <div className="space-y-4 p-4 border rounded-lg bg-white">
              <h3 className="font-semibold text-lg">Hotel Schedules</h3>
              {voucherData.hotelSchedules.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No hotel bookings found for this reservation.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Hotel Name</TableHead>
                        <TableHead>Number of Days</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {voucherData.hotelSchedules.map((hotel, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{hotel.number}</TableCell>
                          <TableCell>{hotel.location}</TableCell>
                          <TableCell>{hotel.hotelName}</TableCell>
                          <TableCell>{hotel.days}</TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={hotel.checkIn ? new Date(hotel.checkIn).toISOString().split('T')[0] : ''}
                              onChange={(e) => handleHotelScheduleChange(idx, 'checkIn', e.target.value)}
                              className="w-40"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={hotel.checkOut ? new Date(hotel.checkOut).toISOString().split('T')[0] : ''}
                              onChange={(e) => handleHotelScheduleChange(idx, 'checkOut', e.target.value)}
                              className="w-40"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Movement Details */}
            <div className="space-y-4 p-4 border rounded-lg bg-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Movement Details</h3>
                <Button type="button" size="sm" onClick={addMovement} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Movement
                </Button>
              </div>
              {voucherData.movementDetails.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No transport bookings found. Click "Add Movement" to add one.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sr</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>From Location</TableHead>
                        <TableHead>To Location</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {voucherData.movementDetails.map((movement, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{movement.sr}</TableCell>
                          <TableCell>
                            <Input
                              value={movement.route}
                              onChange={(e) => handleMovementChange(idx, 'route', e.target.value)}
                              className="w-24"
                              placeholder="Auto"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={movement.date}
                              onChange={(e) => handleMovementChange(idx, 'date', e.target.value)}
                              className="w-40"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={movement.time}
                              onChange={(e) => handleMovementChange(idx, 'time', e.target.value)}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>{movement.fromLocation}</TableCell>
                          <TableCell>{movement.toLocation}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeMovement(idx)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Flight Details */}
            <div className="space-y-4 p-4 border rounded-lg bg-white">
              <h3 className="font-semibold text-lg">Flight Details</h3>
              {voucherData.flightDetails.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No flight details found for this reservation.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Carrier</TableHead>
                        <TableHead>Number</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>ETD</TableHead>
                        <TableHead>ETA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {voucherData.flightDetails.map((flight, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{flight.type}</TableCell>
                          <TableCell>
                            {flight.date ? formatDate(flight.date) : ''}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={flight.carrier}
                              onChange={(e) => handleFlightChange(idx, 'carrier', e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={flight.number}
                              onChange={(e) => handleFlightChange(idx, 'number', e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>{flight.from}</TableCell>
                          <TableCell>{flight.to}</TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={formatTime(flight.etd)}
                              onChange={(e) => handleFlightChange(idx, 'etd', e.target.value)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={formatTime(flight.eta)}
                              onChange={(e) => handleFlightChange(idx, 'eta', e.target.value)}
                              className="w-24"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Generating...' : 'Generate Voucher'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

