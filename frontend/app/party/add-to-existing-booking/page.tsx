'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUser, hasRole } from '@/lib/auth';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { UploadCloud, File, X } from 'lucide-react';
import { umrahVisaAPI } from '@/lib/api';

interface UmrahVisaBooking {
  id: string;
  groupNumber?: string;
  groupName?: string;
  passengerCount: number;
  status: string;
  visaType?: 'individual_visa' | 'group_visa';
  createdAt: string;
}

export default function AddToExistingBookingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<UmrahVisaBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [formData, setFormData] = useState({
    existingBookingId: '',
    newGroupNumber: '',
    newGroupName: '',
    passengerCount: '',
  });
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    setUser(currentUser);
    
    if (!currentUser || !hasRole('party')) {
      router.push('/');
      return;
    }

    loadBookings();
  }, [router]);

  const loadBookings = async () => {
    try {
      setLoadingBookings(true);
      const response = await umrahVisaAPI.getBookings({ page: 1, limit: 1000 });
      const allBookings = response.data.bookings || [];
      // Filter to only show group bookings
      const groupBookings = allBookings.filter((booking: UmrahVisaBooking) => 
        booking.visaType === 'group_visa'
      );
      setBookings(groupBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const isValidZip = file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip');
    
    if (!isValidZip) {
      toast.error('Please upload a ZIP file (.zip) containing all PAN cards');
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 50MB limit. Please compress your files.');
      return;
    }

    setZipFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setZipFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.existingBookingId || !formData.newGroupNumber || !formData.newGroupName || !formData.passengerCount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!zipFile) {
      toast.error('Please upload a ZIP file containing PAN cards');
      return;
    }

    const passengerCountNum = parseInt(formData.passengerCount);
    if (isNaN(passengerCountNum) || passengerCountNum < 1 || passengerCountNum > 50) {
      toast.error('Passenger count must be between 1 and 50');
      return;
    }

    try {
      setLoading(true);

      const formDataToSend = new FormData();
      formDataToSend.append('existingBookingId', formData.existingBookingId);
      formDataToSend.append('newGroupNumber', formData.newGroupNumber);
      formDataToSend.append('newGroupName', formData.newGroupName);
      formDataToSend.append('passengerCount', formData.passengerCount);
      formDataToSend.append('panCardZipFile', zipFile);

      await umrahVisaAPI.addToExistingBooking(formDataToSend);

      toast.success('Group added to existing booking successfully!');
      router.push('/party/dashboard');
    } catch (error: any) {
      console.error('Error adding group to existing booking:', error);
      toast.error(error.response?.data?.error || 'Failed to add group to existing booking');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !user) {
    return null;
  }

  return (
      <PartyLayout 
        title="Add to Existing Booking" 
        subtitle="Add a new group to an existing booking"
      >
        <div className="p-4 sm:p-6">
        <Card>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-lg lg:text-xl">Add Group to Existing Booking</CardTitle>
            <CardDescription className="text-sm lg:text-base">
              Enter the new group details and select which existing booking to add this group to
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
              {/* Select Existing Booking */}
              <div className="space-y-2">
                <Label htmlFor="existingBookingId">Select Existing Booking *</Label>
                {loadingBookings ? (
                  <div className="text-sm text-gray-500 py-2">Loading bookings...</div>
                ) : bookings.length === 0 ? (
                  <div className="text-sm text-gray-500 py-2">No group bookings found. Please create a group booking first.</div>
                ) : (
                  <Select
                    value={formData.existingBookingId}
                    onValueChange={(value) => setFormData({ ...formData, existingBookingId: value })}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a booking" />
                    </SelectTrigger>
                    <SelectContent>
                      {bookings.map((booking) => (
                        <SelectItem key={booking.id} value={booking.id}>
                          {booking.groupNumber || booking.id} - {booking.groupName || 'No group name'} ({booking.passengerCount} pax)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* New Group Number */}
              <div className="space-y-2">
                <Label htmlFor="newGroupNumber">New Group Number *</Label>
                <Input
                  id="newGroupNumber"
                  value={formData.newGroupNumber}
                  onChange={(e) => setFormData({ ...formData, newGroupNumber: e.target.value })}
                  placeholder="e.g., 445566"
                  required
                />
              </div>

              {/* New Group Name */}
              <div className="space-y-2">
                <Label htmlFor="newGroupName">New Group Name *</Label>
                <Input
                  id="newGroupName"
                  value={formData.newGroupName}
                  onChange={(e) => setFormData({ ...formData, newGroupName: e.target.value })}
                  placeholder="Enter group name"
                  required
                />
              </div>

              {/* Number of Passengers */}
              <div className="space-y-2">
                <Label htmlFor="passengerCount">Number of Passengers *</Label>
                <Input
                  id="passengerCount"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.passengerCount}
                  onChange={(e) => setFormData({ ...formData, passengerCount: e.target.value })}
                  placeholder="Enter number of passengers"
                  required
                />
              </div>

              {/* Document Upload */}
              <div className="space-y-2">
                <Label>PAN Cards ZIP File *</Label>
                {!zipFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 lg:p-12 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 bg-gray-50 hover:border-red-400 hover:bg-red-50/50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip,application/zip"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    
                    <div className="flex flex-col items-center justify-center space-y-3 lg:space-y-4">
                      <UploadCloud className={`w-12 h-12 lg:w-16 lg:h-16 ${isDragging ? 'text-red-500' : 'text-gray-400'}`} />
                      <div>
                        <p className="text-base lg:text-lg font-medium text-gray-700 mb-1">
                          {isDragging ? 'Drop your ZIP file here' : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-xs lg:text-sm text-gray-500">
                          ZIP file containing all PAN cards (MAX. 50MB)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 lg:p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
                      <File className="h-6 w-6 lg:h-8 lg:w-8 text-red-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm lg:text-base truncate">{zipFile.name}</p>
                        <p className="text-xs lg:text-sm text-gray-500">
                          {(zipFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                >
                  {loading ? 'Adding Group...' : 'Add Group to Booking'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PartyLayout>
  );
}

