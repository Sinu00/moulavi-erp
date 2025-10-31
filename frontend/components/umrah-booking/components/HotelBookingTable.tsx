import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Hotel } from 'lucide-react';
import { HotelBooking, Location, Hotel as HotelType } from '@/lib/umrah/types';

interface HotelBookingTableProps {
  hotelBookings: HotelBooking[];
  locations: Location[];
  hotels: HotelType[];
  getHotelsForLocation: (locationId: string) => HotelType[];
  onUpdateBooking: (index: number, field: keyof HotelBooking, value: string) => void;
  onRemoveBooking?: (index: number) => void;
  onAddBooking?: () => void;
  disabled?: boolean;
  showAddButton?: boolean;
  emptyStateMessage?: string;
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
}) => {
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
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              #
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Location
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Hotel
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Check-in
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Check-out
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Duration
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
            const location = locations.find((l) => l.id === booking.locationId);
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
                    value={booking.locationId || undefined}
                    onValueChange={(value) => onUpdateBooking(index, 'locationId', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select location" />
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
                    disabled={disabled || !booking.locationId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select hotel" />
                    </SelectTrigger>
                    <SelectContent>
                      {getHotelsForLocation(booking.locationId)
                        .filter((hotel) => hotel.id && hotel.id.trim() !== '')
                        .map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.hotelName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border border-gray-200 p-3">
                  <Input
                    type="date"
                    value={booking.checkInDate}
                    onChange={(e) => onUpdateBooking(index, 'checkInDate', e.target.value)}
                    className="w-full"
                    disabled={disabled}
                  />
                </td>
                <td className="border border-gray-200 p-3">
                  <Input
                    type="date"
                    value={booking.checkOutDate}
                    onChange={(e) => onUpdateBooking(index, 'checkOutDate', e.target.value)}
                    className="w-full"
                    disabled={disabled}
                  />
                </td>
                <td className="border border-gray-200 p-3">
                  <div className="text-sm text-gray-600">
                    {duration > 0 ? `${duration} night${duration > 1 ? 's' : ''}` : '-'}
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
  );
};

