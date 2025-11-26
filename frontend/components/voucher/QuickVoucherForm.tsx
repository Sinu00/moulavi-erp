'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { voucherAPI, umrahVisaAPI } from '@/lib/api';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QuickVoucherFormProps {
  onSuccess: () => void;
}

export function QuickVoucherForm({ onSuccess }: QuickVoucherFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    bookingId: '',
    guestName: '',
    guestMobile: '',
    groupCode: '',
    paxCount: 1,
    reservationDate: new Date().toISOString().split('T')[0],
    hotelSchedules: [] as any[],
    movementDetails: [] as any[],
    flightDetails: [] as any[],
  });

  const handleSubmit = async () => {
    if (!formData.bookingId) {
      toast.error('Booking ID is required');
      return;
    }

    if (!formData.guestName || !formData.paxCount) {
      toast.error('Guest name and passenger count are required');
      return;
    }

    try {
      setSubmitting(true);
      await voucherAPI.createQuickVoucher({
        bookingId: formData.bookingId,
        guestName: formData.guestName,
        guestMobile: formData.guestMobile,
        groupCode: formData.groupCode,
        paxCount: formData.paxCount,
        reservationDate: formData.reservationDate,
        hotelSchedules: formData.hotelSchedules,
        movementDetails: formData.movementDetails,
        flightDetails: formData.flightDetails,
      });

      toast.success('Quick voucher created successfully');
      onSuccess();
      
      // Reset form
      setFormData({
        bookingId: '',
        guestName: '',
        guestMobile: '',
        groupCode: '',
        paxCount: 1,
        reservationDate: new Date().toISOString().split('T')[0],
        hotelSchedules: [],
        movementDetails: [],
        flightDetails: [],
      });
    } catch (error: any) {
      console.error('Error creating quick voucher:', error);
      toast.error(error?.response?.data?.error || 'Failed to create quick voucher');
    } finally {
      setSubmitting(false);
    }
  };

  const addMovement = () => {
    setFormData({
      ...formData,
      movementDetails: [
        ...formData.movementDetails,
        {
          sr: formData.movementDetails.length + 1,
          route: '',
          date: '',
          time: '',
          from: '',
          fromLocation: '',
          to: '',
          toLocation: '',
          driverDetails1: '',
          driverDetails2: '',
          vehicleNumber: '',
        },
      ],
    });
  };

  const removeMovement = (index: number) => {
    const updated = formData.movementDetails.filter((_, i) => i !== index);
    updated.forEach((m, idx) => {
      m.sr = idx + 1;
    });
    setFormData({ ...formData, movementDetails: updated });
  };

  const updateMovement = (index: number, field: string, value: any) => {
    const updated = [...formData.movementDetails];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, movementDetails: updated });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quick Voucher Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bookingId">Booking ID *</Label>
              <Input
                id="bookingId"
                value={formData.bookingId}
                onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
                placeholder="Enter booking ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestName">Guest Name *</Label>
              <Input
                id="guestName"
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                placeholder="Enter guest name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestMobile">Guest Mobile</Label>
              <Input
                id="guestMobile"
                value={formData.guestMobile}
                onChange={(e) => setFormData({ ...formData, guestMobile: e.target.value })}
                placeholder="Enter mobile number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupCode">Group Code</Label>
              <Input
                id="groupCode"
                value={formData.groupCode}
                onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
                placeholder="Enter group code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paxCount">Passenger Count *</Label>
              <Input
                id="paxCount"
                type="number"
                value={formData.paxCount}
                onChange={(e) => setFormData({ ...formData, paxCount: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reservationDate">Reservation Date</Label>
              <Input
                id="reservationDate"
                type="date"
                value={formData.reservationDate}
                onChange={(e) => setFormData({ ...formData, reservationDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movement Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Movement Details</CardTitle>
            <Button onClick={addMovement} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Movement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.movementDetails.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No movement details. Click "Add Movement" to add one.</p>
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
                    <TableHead>Driver 1</TableHead>
                    <TableHead>Driver 2</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.movementDetails.map((movement, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{movement.sr}</TableCell>
                      <TableCell>
                        <Input
                          value={movement.route}
                          onChange={(e) => updateMovement(idx, 'route', e.target.value)}
                          className="w-24"
                          placeholder="Route"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={movement.date}
                          onChange={(e) => updateMovement(idx, 'date', e.target.value)}
                          className="w-40"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={movement.time}
                          onChange={(e) => updateMovement(idx, 'time', e.target.value)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={movement.fromLocation}
                          onChange={(e) => updateMovement(idx, 'fromLocation', e.target.value)}
                          className="w-32"
                          placeholder="From"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={movement.toLocation}
                          onChange={(e) => updateMovement(idx, 'toLocation', e.target.value)}
                          className="w-32"
                          placeholder="To"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={movement.driverDetails1}
                          onChange={(e) => updateMovement(idx, 'driverDetails1', e.target.value)}
                          className="w-32"
                          placeholder="Driver 1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={movement.driverDetails2}
                          onChange={(e) => updateMovement(idx, 'driverDetails2', e.target.value)}
                          className="w-32"
                          placeholder="Driver 2"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={movement.vehicleNumber}
                          onChange={(e) => updateMovement(idx, 'vehicleNumber', e.target.value)}
                          className="w-32"
                          placeholder="Vehicle"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
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
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => {
            setFormData({
              bookingId: '',
              guestName: '',
              guestMobile: '',
              groupCode: '',
              paxCount: 1,
              reservationDate: new Date().toISOString().split('T')[0],
              hotelSchedules: [],
              movementDetails: [],
              flightDetails: [],
            });
          }}
        >
          Reset
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Voucher
        </Button>
      </div>
    </div>
  );
}

