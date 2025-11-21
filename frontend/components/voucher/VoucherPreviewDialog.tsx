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
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Minus, Trash2, Truck, Users, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { umrahVisaAPI, transportMasterAPI, transportRouteMasterAPI } from '@/lib/api';
import api from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RouteType } from '@/types';

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
  from: string; // City name
  fromLocation: string; // Specific location (Airport, Hotel, Ziyarat)
  to: string; // City name
  toLocation: string; // Specific location (Airport, Hotel, Ziyarat)
  fromLocationId?: string;
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

interface TransportOption {
  transportId: string;
  routeId: string;
  route: {
    id: string;
    city1: { id: string; name: string } | null;
    city2: { id: string; name: string } | null;
    city3: { id: string; name: string } | null;
    city4: { id: string; name: string } | null;
    routeType: string;
  } | null;
  vehicleType: {
    id: string;
    vehicleName: string;
    paxCount: number;
  } | null;
  price: number;
  quantity: number;
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
    reservationNumber: '',
    guestName: '',
    guestMobile: '',
    groupCode: '',
    paxCount: 0,
    umrahVisaProvider: null as {
      partyName: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      contactNumber?: string;
      whatsappNumber?: string;
      email?: string;
    } | null,
    hotelSchedules: [] as HotelSchedule[],
    movementDetails: [] as MovementDetail[],
    flightDetails: [] as FlightDetail[],
    transportOptions: [] as TransportOption[],
  });
  const [loadingTransports, setLoadingTransports] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeTypeFilter, setRouteTypeFilter] = useState<RouteType | 'all'>('all');
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [routeTransports, setRouteTransports] = useState<any[]>([]);

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
        reservationNumber: data.reservationNumber || '',
        guestName: data.guestName || '',
        guestMobile: data.guestMobile || '',
        groupCode: data.groupCode || '',
        paxCount: data.paxCount || 0,
        umrahVisaProvider: data.umrahVisaProvider || null,
        hotelSchedules: (data.hotelSchedules || []).map((hs: any) => ({
          ...hs,
          checkIn: hs.checkIn ? (typeof hs.checkIn === 'string' && hs.checkIn.match(/^\d{2}-\d{2}-\d{4}/) 
            ? (() => { const [d, m, y] = hs.checkIn.split('-'); return `${y}-${m}-${d}`; })() 
            : new Date(hs.checkIn).toISOString().split('T')[0]) : '',
          checkOut: hs.checkOut ? (typeof hs.checkOut === 'string' && hs.checkOut.match(/^\d{2}-\d{2}-\d{4}/) 
            ? (() => { const [d, m, y] = hs.checkOut.split('-'); return `${y}-${m}-${d}`; })() 
            : new Date(hs.checkOut).toISOString().split('T')[0]) : '',
        })),
        movementDetails: (data.movementDetails || []).map((m: any, idx: number) => {
          // Handle date format - backend sends DD-MM-YYYY, convert to YYYY-MM-DD for date input
          let dateValue = '';
          if (m.date) {
            if (typeof m.date === 'string') {
              // Check if it's already in ISO format (YYYY-MM-DD)
              if (m.date.match(/^\d{4}-\d{2}-\d{2}/)) {
                dateValue = m.date.split('T')[0]; // Extract date part if ISO format
              } else if (m.date.match(/^\d{2}-\d{2}-\d{4}/)) {
                // Handle DD-MM-YYYY format from backend
                const [day, month, year] = m.date.split('-');
                dateValue = `${year}-${month}-${day}`;
              } else {
                // Try to parse as Date object
                const dateObj = new Date(m.date);
                if (!isNaN(dateObj.getTime())) {
                  dateValue = dateObj.toISOString().split('T')[0];
                }
              }
            } else if (m.date instanceof Date) {
              dateValue = m.date.toISOString().split('T')[0];
            }
          }

          return {
            ...m,
            sr: idx + 1,
            date: dateValue,
            time: m.time ? (typeof m.time === 'string' && m.time.includes('T') ? m.time.split('T')[1].slice(0, 5) : m.time.slice(0, 5)) : '',
            // Ensure from/to and fromLocation/toLocation are properly set
            from: m.from || '',
            fromLocation: m.fromLocation || '',
            to: m.to || '',
            toLocation: m.toLocation || '',
          };
        }),
        flightDetails: (data.flightDetails || []).map((fd: any) => ({
          ...fd,
          date: fd.date ? (typeof fd.date === 'string' && fd.date.match(/^\d{2}-\d{2}-\d{4}/) 
            ? (() => { const [d, m, y] = fd.date.split('-'); return `${y}-${m}-${d}`; })() 
            : new Date(fd.date).toISOString().split('T')[0]) : '',
        })),
        transportOptions: (data.transportOptions || []) as TransportOption[],
      });
      
      // Auto-select route from existing transport options if available
      if (data.transportOptions && data.transportOptions.length > 0) {
        const firstTransportRouteId = data.transportOptions[0]?.routeId;
        if (firstTransportRouteId) {
          setSelectedRouteId(firstTransportRouteId);
        }
      }
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

  // Load all active routes
  useEffect(() => {
    if (open) {
      loadRoutes();
    }
  }, [open]);

  const loadRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const response = await transportRouteMasterAPI.getActive();
      const routes = response.data.transportRouteMasters || [];
      setAvailableRoutes(routes);
      
      // Auto-select first route if available
      if (routes.length > 0 && !selectedRouteId) {
        setSelectedRouteId(routes[0].id);
      }
    } catch (error: any) {
      console.error('Error loading routes:', error);
      toast.error('Failed to load routes');
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Filter routes by routeType
  const filteredRoutes = availableRoutes.filter(route => {
    if (routeTypeFilter === 'all') return true;
    return route.routeType === routeTypeFilter;
  });

  // Load transports when route is selected
  useEffect(() => {
    const loadTransports = async () => {
      if (!selectedRouteId) {
        setRouteTransports([]);
        return;
      }

      setLoadingTransports(true);
      try {
        const response = await transportMasterAPI.getByRoute(selectedRouteId);
        const transports = response.data.transportMasters || [];
        setRouteTransports(transports);
      } catch (error: any) {
        console.error('Error loading transports:', error);
        toast.error('Failed to load transport vehicles');
        setRouteTransports([]);
      } finally {
        setLoadingTransports(false);
      }
    };

    loadTransports();
  }, [selectedRouteId]);

  // Helper function to format route display
  const formatRouteDisplay = (route: any): string => {
    const cities = [
      route.city1?.name,
      route.city2?.name,
      route.city3?.name,
      route.city4?.name,
    ].filter(Boolean);
    const routeString = cities.join(' → ');
    const routeTypeLabel = route.routeType
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `${routeString} (${routeTypeLabel})`;
  };

  const getRouteString = (route: TransportOption['route'] | null) => {
    if (!route) return 'No route';
    const cities = [
      route.city1?.name,
      route.city2?.name,
      route.city3?.name,
      route.city4?.name,
    ].filter(Boolean);
    if (cities.length === 0) return 'No route';
    return cities.map(city => city?.toLowerCase() || '').join(' - ');
  };


  const handleTransportQuantityChange = (transportId: string, delta: number) => {
    const existingIndex = voucherData.transportOptions.findIndex(t => t.transportId === transportId);
    
    if (existingIndex >= 0) {
      // Update existing transport quantity
      const updated = [...voucherData.transportOptions];
      const currentQty = updated[existingIndex]?.quantity || 0;
      const newQty = Math.max(0, currentQty + delta);
      
      if (newQty === 0) {
        // Remove if quantity becomes 0
        updated.splice(existingIndex, 1);
      } else {
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
      }
      setVoucherData({ ...voucherData, transportOptions: updated });
    } else {
      // Add new transport
      const transport = routeTransports.find(t => t.id === transportId);
      if (transport && transport.vehicleType) {
        const newTransport: TransportOption = {
          transportId: transport.id,
          routeId: transport.routeId,
          route: transport.route ? {
            id: transport.route.id,
            city1: transport.route.city1,
            city2: transport.route.city2,
            city3: transport.route.city3,
            city4: transport.route.city4,
            routeType: transport.route.routeType,
          } : null,
          vehicleType: transport.vehicleType,
          price: Number(transport.price),
          quantity: 1,
        };
        setVoucherData({
          ...voucherData,
          transportOptions: [...voucherData.transportOptions, newTransport],
        });
      }
    }
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
      from: '',
      fromLocation: '',
      to: '',
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
        
        const pdfData = {
          voucherNumber: generatedVoucher?.voucherNumber || '001',
          reservationNumber: submissionData.reservationNumber || generatedVoucher?.reservationNumber || '',
          reservationDate: submissionData.reservationDate || generatedVoucher?.reservationDate,
          guestName: submissionData.guestName || generatedVoucher?.guestName,
          guestMobile: submissionData.guestMobile || generatedVoucher?.guestMobile,
          groupCode: submissionData.groupCode || generatedVoucher?.groupCode,
          paxCount: submissionData.paxCount || generatedVoucher?.paxCount,
          umrahVisaProvider: submissionData.umrahVisaProvider || generatedVoucher?.umrahVisaProvider || null,
          hotelSchedules: submissionData.hotelSchedules || generatedVoucher?.hotelSchedules || [],
          movementDetails: movementDetailsWithRoutes,
          flightDetails: submissionData.flightDetails || generatedVoucher?.flightDetails || [],
        };

        // Call backend to generate PDF
        const pdfResponse = await api.post('/umrah-visa/generate-pdf', pdfData, {
          responseType: 'blob',
        });

        // Create blob and download
        const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Voucher_${pdfData.voucherNumber}_${pdfData.guestName
          .replace(/\s+/g, '_')
          .slice(0, 20)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
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
                  <Label>Reservation Number</Label>
                  <Input
                    value={voucherData.reservationNumber}
                    onChange={(e) => setVoucherData({ ...voucherData, reservationNumber: e.target.value })}
                    placeholder="Auto-generated"
                  />
                </div>
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
                <p className="text-sm text-gray-500 py-4">No movement details found. Click "Add Movement" to add one.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sr</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>From City</TableHead>
                        <TableHead>From Location</TableHead>
                        <TableHead>To City</TableHead>
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
                          <TableCell>
                            <div className="text-sm font-medium">{movement.from || 'N/A'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600">{movement.fromLocation || 'N/A'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{movement.to || 'N/A'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600">{movement.toLocation || 'N/A'}</div>
                          </TableCell>
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

            {/* Transport Options */}
            <div className="space-y-4 p-4 border rounded-lg bg-white">
              <h3 className="font-semibold text-lg">Transport Options</h3>
              
              {/* Route Summary */}
              {selectedRouteId && (
                <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                  <MapPin className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatRouteDisplay(availableRoutes.find(r => r.id === selectedRouteId) || {})}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {voucherData.paxCount || 0} Passengers
                    </p>
                  </div>
                </div>
              )}

              {/* Filters */}
              {loadingRoutes ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Filter by Route Type</label>
                    <Select
                      value={routeTypeFilter}
                      onValueChange={(value) => setRouteTypeFilter(value as RouteType | 'all')}
                      disabled={loadingRoutes}
                    >
                      <SelectTrigger className="w-full border-gray-300">
                        <SelectValue placeholder="Select route type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Route Types</SelectItem>
                        <SelectItem value="fulltrip">Full Trip</SelectItem>
                        <SelectItem value="airporttocity">Airport to City</SelectItem>
                        <SelectItem value="citytocity">City to City</SelectItem>
                        <SelectItem value="citytoairport">City to Airport</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Select Route</label>
                    <Select
                      value={selectedRouteId || ''}
                      onValueChange={(value) => setSelectedRouteId(value || null)}
                      disabled={loadingRoutes || filteredRoutes.length === 0}
                    >
                      <SelectTrigger className="w-full border-gray-300">
                        <SelectValue placeholder="Select a route" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredRoutes.length === 0 ? (
                          <SelectItem value="__no_routes__" disabled>
                            No routes available
                          </SelectItem>
                        ) : (
                          filteredRoutes.map((route) => (
                            <SelectItem key={route.id} value={route.id}>
                              {formatRouteDisplay(route)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Transport Table */}
              {selectedRouteId && (
                <>
                  {loadingTransports ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-red-600" />
                      <span className="ml-2 text-sm text-gray-600">Loading transport vehicles...</span>
                    </div>
                  ) : routeTransports.length === 0 ? (
                    <div className="text-center py-8">
                      <Truck className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No transport vehicles available for this route.</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-medium text-gray-700">Vehicle Name</TableHead>
                            <TableHead className="font-medium text-gray-700">Capacity</TableHead>
                            <TableHead className="font-medium text-gray-700">Price</TableHead>
                            <TableHead className="font-medium text-gray-700">Quantity</TableHead>
                            <TableHead className="font-medium text-gray-700 text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {routeTransports.map((transport) => {
                            if (!transport.vehicleType) return null;
                            const selectedTransport = voucherData.transportOptions.find(t => t.transportId === transport.id);
                            const quantity = selectedTransport?.quantity || 0;
                            const price = Number(transport.price);
                            const total = price * quantity;
                            const isSelected = quantity > 0;
                            return (
                              <TableRow 
                                key={transport.id}
                                className={isSelected ? 'bg-red-50' : ''}
                              >
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Truck className={`h-4 w-4 ${isSelected ? 'text-red-600' : 'text-gray-400'}`} />
                                    <span className="font-medium text-gray-900">{transport.vehicleType.vehicleName}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Users className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-700">{transport.vehicleType.paxCount} PAX</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium text-gray-900">₹{price.toLocaleString('en-IN')}</span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTransportQuantityChange(transport.id, -1)}
                                      disabled={quantity === 0}
                                      className="h-7 w-7 p-0 border-gray-300 hover:bg-red-50 hover:border-red-300"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className={`text-sm font-medium w-8 text-center ${
                                      isSelected ? 'text-red-600' : 'text-gray-900'
                                    }`}>
                                      {quantity}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTransportQuantityChange(transport.id, 1)}
                                      className="h-7 w-7 p-0 border-gray-300 hover:bg-red-50 hover:border-red-300"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className={`font-semibold ${
                                    isSelected ? 'text-red-600' : 'text-gray-900'
                                  }`}>
                                    ₹{total.toLocaleString('en-IN')}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
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

