import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Hotel } from 'lucide-react';
import { HotelBooking, Location, Hotel as HotelType } from '@/lib/umrah/types';

interface HotelBookingTableProps {
  hotelBookings: HotelBooking[];
  locations: Location[];
  hotels: HotelType[];
  getHotelsForLocation: (cityId: string) => HotelType[];
  onUpdateBooking: (index: number, field: keyof HotelBooking, value: string | string[]) => void;
  onRemoveBooking?: (index: number) => void;
  onAddBooking?: () => void;
  disabled?: boolean;
  showAddButton?: boolean;
  emptyStateMessage?: string;
  arrivalDate?: string; // For date range validation
  departureDate?: string; // For date range validation
}

export const HotelBookingTable: React.FC<HotelBookingTableProps> = ({
  hotelBookings,
  locations,
  hotels,
  getHotelsForLocation,
  onUpdateBooking,
  onRemoveBooking,
  onAddBooking,
  disabled = false,
  showAddButton = false,
  emptyStateMessage,
  arrivalDate,
  departureDate,
}) => {
  // Store raw input values for BRN fields to preserve commas while typing
  const [brnInputs, setBrnInputs] = useState<{ [key: number]: string }>({});
  // Store raw input values for duration fields
  const [durationInputs, setDurationInputs] = useState<{ [key: number]: string }>({});

  // Initialize BRN inputs from booking data
  React.useEffect(() => {
    const inputs: { [key: number]: string } = {};
    hotelBookings.forEach((booking, index) => {
      if (booking.brn && booking.brn.length > 0) {
        inputs[index] = booking.brn.join(', ');
      } else if (!brnInputs[index]) {
        inputs[index] = '';
      }
    });
    setBrnInputs(prev => ({ ...prev, ...inputs }));
  }, [hotelBookings.length]);

  // Initialize duration inputs from booking data
  React.useEffect(() => {
    const inputs: { [key: number]: string } = {};
    hotelBookings.forEach((booking, index) => {
      const checkIn = booking.checkInDate ? new Date(booking.checkInDate) : null;
      const checkOut = booking.checkOutDate ? new Date(booking.checkOutDate) : null;
      if (checkIn && checkOut) {
        const duration = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        inputs[index] = duration > 0 ? duration.toString() : '';
      } else if (!durationInputs[index]) {
        inputs[index] = '';
      }
    });
    setDurationInputs(prev => ({ ...prev, ...inputs }));
  }, [hotelBookings.length]);

  if (hotelBookings.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <Hotel className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hotel bookings added</h3>
        <p className="text-gray-500 mb-4">
          {emptyStateMessage || 'Add your first hotel booking to get started'}
        </p>
        {showAddButton && onAddBooking && (
          <Button type="button" variant="outline" onClick={onAddBooking} disabled={disabled}>
            <Hotel className="h-4 w-4 mr-2" />
            Add First Hotel
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              #
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              City
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Hotel
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Check-in
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Duration
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Check-out
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              BRN
            </th>
            {onRemoveBooking && (
              <th className="border border-gray-200 p-3 text-center text-sm font-medium text-gray-700">
                Action
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {hotelBookings.map((booking, index) => {
            const location = locations.find((l) => l.id === booking.cityId);
            const hotel = hotels.find((h) => h.id === booking.hotelId);
            const checkIn = booking.checkInDate ? new Date(booking.checkInDate) : null;
            const checkOut = booking.checkOutDate ? new Date(booking.checkOutDate) : null;
            const duration =
              checkIn && checkOut
                ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
                : 0;

            return (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-200 p-3 font-medium text-gray-900">
                  {index + 1}
                </td>
                <td className="border border-gray-200 p-3">
                  <Select
                    value={booking.cityId || undefined}
                    onValueChange={(value) => onUpdateBooking(index, 'cityId', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations
                        .filter((location) => location.id && location.id.trim() !== '')
                        .map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.destinationName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border border-gray-200 p-3">
                  <Select
                    value={booking.hotelId || undefined}
                    onValueChange={(value) => onUpdateBooking(index, 'hotelId', value)}
                    disabled={disabled || !booking.cityId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select hotel" />
                    </SelectTrigger>
                    <SelectContent>
                      {getHotelsForLocation(booking.cityId)
                        .filter((hotel) => hotel.id && hotel.id.trim() !== '')
                        .map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.name || hotel.hotelName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border border-gray-200 p-3">
                  <Input
                    type="date"
                    value={booking.checkInDate}
                    min={arrivalDate} // Visual guidance only
                    max={departureDate} // Visual guidance only
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      // Allow any date to be entered - validation happens on next step
                      onUpdateBooking(index, 'checkInDate', selectedDate);
                      // If duration is set, recalculate check-out date
                      const durationValue = durationInputs[index] ?? (duration > 0 ? duration.toString() : '');
                      const durationNum = parseInt(durationValue, 10);
                      if (!isNaN(durationNum) && durationNum > 0 && selectedDate) {
                        const checkIn = new Date(selectedDate);
                        const checkOut = new Date(checkIn);
                        checkOut.setDate(checkOut.getDate() + durationNum);
                        // Allow check-out to exceed departure date - user can see this in coverage indicator
                        const checkOutStr = checkOut.toISOString().split('T')[0];
                        onUpdateBooking(index, 'checkOutDate', checkOutStr);
                      } else if (selectedDate && booking.checkOutDate) {
                        // If check-out exists but no duration set, recalculate duration
                        const checkIn = new Date(selectedDate);
                        const checkOut = new Date(booking.checkOutDate);
                        const newDuration = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                        setDurationInputs(prev => ({ ...prev, [index]: newDuration > 0 ? newDuration.toString() : '' }));
                      }
                    }}
                    className="w-full"
                    disabled={disabled}
                  />
                </td>
                <td className="border border-gray-200 p-3">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Days"
                    value={durationInputs[index] ?? (duration > 0 ? duration.toString() : '')}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      // Store the raw input value
                      setDurationInputs(prev => ({ ...prev, [index]: inputValue }));
                      
                      // Calculate check-out date from duration if check-in date exists
                      const durationNum = parseInt(inputValue, 10);
                      if (!isNaN(durationNum) && durationNum > 0 && booking.checkInDate) {
                        const checkIn = new Date(booking.checkInDate);
                        const checkOut = new Date(checkIn);
                        checkOut.setDate(checkOut.getDate() + durationNum);
                        // Allow check-out to exceed departure date - user can see this in coverage indicator
                        const checkOutStr = checkOut.toISOString().split('T')[0];
                        onUpdateBooking(index, 'checkOutDate', checkOutStr);
                      } else if (inputValue === '' || inputValue === '0') {
                        // Clear check-out if duration is cleared
                        onUpdateBooking(index, 'checkOutDate', '');
                      }
                    }}
                    onBlur={(e) => {
                      // On blur, validate and sync
                      const inputValue = e.target.value.trim();
                      const durationNum = parseInt(inputValue, 10);
                      
                      if (inputValue === '' || isNaN(durationNum) || durationNum <= 0) {
                        setDurationInputs(prev => ({ ...prev, [index]: '' }));
                        if (inputValue !== '' && booking.checkInDate) {
                          // If invalid input but check-in exists, recalculate from check-out
                          const checkIn = booking.checkInDate ? new Date(booking.checkInDate) : null;
                          const checkOut = booking.checkOutDate ? new Date(booking.checkOutDate) : null;
                          if (checkIn && checkOut) {
                            const calculatedDuration = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                            setDurationInputs(prev => ({ ...prev, [index]: calculatedDuration > 0 ? calculatedDuration.toString() : '' }));
                          }
                        }
                      } else {
                        setDurationInputs(prev => ({ ...prev, [index]: durationNum.toString() }));
                      }
                    }}
                    className="w-full"
                    disabled={disabled || !booking.checkInDate}
                  />
                </td>
                <td className="border border-gray-200 p-3">
                  <Input
                    type="date"
                    value={booking.checkOutDate}
                    min={booking.checkInDate || arrivalDate} // Visual guidance only
                    max={departureDate} // Visual guidance only
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      // Allow any date to be entered - validation happens on next step
                      // Only validate that check-out is after check-in
                      if (booking.checkInDate && selectedDate <= booking.checkInDate) {
                        return; // Don't update if before or equal to check-in
                      }
                      
                      onUpdateBooking(index, 'checkOutDate', selectedDate);
                      // Update duration when check-out changes manually
                      if (selectedDate && booking.checkInDate) {
                        const checkIn = new Date(booking.checkInDate);
                        const checkOut = new Date(selectedDate);
                        const newDuration = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                        setDurationInputs(prev => ({ ...prev, [index]: newDuration > 0 ? newDuration.toString() : '' }));
                      }
                    }}
                    className="w-full"
                    disabled={disabled}
                  />
                </td>
                <td className="border border-gray-200 p-3">
                  <div className="space-y-1">
                    <Input
                      type="text"
                      placeholder="Enter BRN (comma-separated for multiple)"
                      value={brnInputs[index] ?? (booking.brn?.join(', ') || '')}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        // Store the raw input value (preserves commas while typing)
                        setBrnInputs(prev => ({ ...prev, [index]: inputValue }));
                        
                        // Process and update the booking with parsed BRNs
                        const brnArray = inputValue
                          .split(',')
                          .map(brn => brn.trim())
                          .filter(brn => brn.length > 0);
                        onUpdateBooking(index, 'brn', brnArray.length > 0 ? brnArray : []);
                      }}
                      onBlur={(e) => {
                        // On blur, clean up and sync the display
                        const inputValue = e.target.value.trim();
                        const brnArray = inputValue
                          .split(',')
                          .map(brn => brn.trim())
                          .filter(brn => brn.length > 0);
                        
                        // Update the stored input to cleaned version
                        if (brnArray.length > 0) {
                          setBrnInputs(prev => ({ ...prev, [index]: brnArray.join(', ') }));
                        } else {
                          setBrnInputs(prev => ({ ...prev, [index]: '' }));
                        }
                        onUpdateBooking(index, 'brn', brnArray.length > 0 ? brnArray : []);
                      }}
                      className="w-full min-w-[200px]"
                      disabled={disabled}
                    />
                    <div className="text-xs text-gray-500">
                      {booking.brn && booking.brn.length > 0 ? (
                        <span className="text-blue-600 font-medium">
                          {booking.brn.length} BRN{booking.brn.length > 1 ? 's' : ''} entered
                        </span>
                      ) : (
                        <span>Separate multiple BRNs with commas (e.g., BRN001, BRN002)</span>
                      )}
                    </div>
                  </div>
                </td>
                {onRemoveBooking && (
                  <td className="border border-gray-200 p-3 text-center">
                    {hotelBookings.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRemoveBooking(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={disabled}
                      >
                        Remove
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {hotelBookings.map((booking, index) => {
          const location = locations.find((l) => l.id === booking.cityId);
          const hotel = hotels.find((h) => h.id === booking.hotelId);
          const checkIn = booking.checkInDate ? new Date(booking.checkInDate) : null;
          const checkOut = booking.checkOutDate ? new Date(booking.checkOutDate) : null;
          const duration =
            checkIn && checkOut
              ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
              : 0;

          return (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-red-600">{index + 1}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">Hotel Booking #{index + 1}</h4>
                </div>
                {onRemoveBooking && hotelBookings.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveBooking(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={disabled}
                  >
                    Remove
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-600">City *</Label>
                  <Select
                    value={booking.cityId || undefined}
                    onValueChange={(value) => onUpdateBooking(index, 'cityId', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations
                        .filter((location) => location.id && location.id.trim() !== '')
                        .map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.destinationName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-600">Hotel *</Label>
                  <Select
                    value={booking.hotelId || undefined}
                    onValueChange={(value) => onUpdateBooking(index, 'hotelId', value)}
                    disabled={disabled || !booking.cityId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select hotel" />
                    </SelectTrigger>
                    <SelectContent>
                      {getHotelsForLocation(booking.cityId)
                        .filter((hotel) => hotel.id && hotel.id.trim() !== '')
                        .map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.name || hotel.hotelName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-600">Check-in *</Label>
                    <Input
                      type="date"
                      value={booking.checkInDate}
                      min={arrivalDate}
                      max={departureDate}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        onUpdateBooking(index, 'checkInDate', selectedDate);
                        const durationValue = durationInputs[index] ?? (duration > 0 ? duration.toString() : '');
                        const durationNum = parseInt(durationValue, 10);
                        if (!isNaN(durationNum) && durationNum > 0 && selectedDate) {
                          const checkIn = new Date(selectedDate);
                          const checkOut = new Date(checkIn);
                          checkOut.setDate(checkOut.getDate() + durationNum);
                          const checkOutStr = checkOut.toISOString().split('T')[0];
                          onUpdateBooking(index, 'checkOutDate', checkOutStr);
                        } else if (selectedDate && booking.checkOutDate) {
                          const checkIn = new Date(selectedDate);
                          const checkOut = new Date(booking.checkOutDate);
                          const newDuration = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                          setDurationInputs(prev => ({ ...prev, [index]: newDuration > 0 ? newDuration.toString() : '' }));
                        }
                      }}
                      className="w-full"
                      disabled={disabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-600">Check-out *</Label>
                    <Input
                      type="date"
                      value={booking.checkOutDate}
                      min={booking.checkInDate || arrivalDate}
                      max={departureDate}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        if (booking.checkInDate && selectedDate <= booking.checkInDate) {
                          return;
                        }
                        onUpdateBooking(index, 'checkOutDate', selectedDate);
                        if (selectedDate && booking.checkInDate) {
                          const checkIn = new Date(booking.checkInDate);
                          const checkOut = new Date(selectedDate);
                          const newDuration = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                          setDurationInputs(prev => ({ ...prev, [index]: newDuration > 0 ? newDuration.toString() : '' }));
                        }
                      }}
                      className="w-full"
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-600">Duration (Days)</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Days"
                    value={durationInputs[index] ?? (duration > 0 ? duration.toString() : '')}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      setDurationInputs(prev => ({ ...prev, [index]: inputValue }));
                      const durationNum = parseInt(inputValue, 10);
                      if (!isNaN(durationNum) && durationNum > 0 && booking.checkInDate) {
                        const checkIn = new Date(booking.checkInDate);
                        const checkOut = new Date(checkIn);
                        checkOut.setDate(checkOut.getDate() + durationNum);
                        const checkOutStr = checkOut.toISOString().split('T')[0];
                        onUpdateBooking(index, 'checkOutDate', checkOutStr);
                      } else if (inputValue === '' || inputValue === '0') {
                        onUpdateBooking(index, 'checkOutDate', '');
                      }
                    }}
                    onBlur={(e) => {
                      const inputValue = e.target.value.trim();
                      const durationNum = parseInt(inputValue, 10);
                      if (inputValue === '' || isNaN(durationNum) || durationNum <= 0) {
                        setDurationInputs(prev => ({ ...prev, [index]: '' }));
                        if (inputValue !== '' && booking.checkInDate) {
                          const checkIn = booking.checkInDate ? new Date(booking.checkInDate) : null;
                          const checkOut = booking.checkOutDate ? new Date(booking.checkOutDate) : null;
                          if (checkIn && checkOut) {
                            const calculatedDuration = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                            setDurationInputs(prev => ({ ...prev, [index]: calculatedDuration > 0 ? calculatedDuration.toString() : '' }));
                          }
                        }
                      } else {
                        setDurationInputs(prev => ({ ...prev, [index]: durationNum.toString() }));
                      }
                    }}
                    className="w-full"
                    disabled={disabled || !booking.checkInDate}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-600">BRN (comma-separated for multiple)</Label>
                  <Input
                    type="text"
                    placeholder="Enter BRN (comma-separated for multiple)"
                    value={brnInputs[index] ?? (booking.brn?.join(', ') || '')}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      setBrnInputs(prev => ({ ...prev, [index]: inputValue }));
                      const brnArray = inputValue
                        .split(',')
                        .map(brn => brn.trim())
                        .filter(brn => brn.length > 0);
                      onUpdateBooking(index, 'brn', brnArray.length > 0 ? brnArray : []);
                    }}
                    onBlur={(e) => {
                      const inputValue = e.target.value.trim();
                      const brnArray = inputValue
                        .split(',')
                        .map(brn => brn.trim())
                        .filter(brn => brn.length > 0);
                      if (brnArray.length > 0) {
                        setBrnInputs(prev => ({ ...prev, [index]: brnArray.join(', ') }));
                      } else {
                        setBrnInputs(prev => ({ ...prev, [index]: '' }));
                      }
                      onUpdateBooking(index, 'brn', brnArray.length > 0 ? brnArray : []);
                    }}
                    className="w-full"
                    disabled={disabled}
                  />
                  <div className="text-xs text-gray-500">
                    {booking.brn && booking.brn.length > 0 ? (
                      <span className="text-blue-600 font-medium">
                        {booking.brn.length} BRN{booking.brn.length > 1 ? 's' : ''} entered
                      </span>
                    ) : (
                      <span>Separate multiple BRNs with commas</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

