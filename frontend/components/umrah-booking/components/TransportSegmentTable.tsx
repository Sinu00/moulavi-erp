import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { TransportBooking, Location, Hotel as HotelType } from '@/lib/umrah/types';

interface TransportSegmentTableProps {
  transportSegments: TransportBooking[];
  locations: Location[];
  getAllHotelsForLocation: (locationId: string) => HotelType[];
  getOptionsForRow: (index: number) => any[];
  onUpdateSegment: (index: number, field: keyof TransportBooking, value: any) => void;
  onRemoveSegment: (index: number) => void;
  onLoadOptions: (index: number, fromId?: string, toId?: string) => void;
  disabled?: boolean;
  emptyMessage?: string;
}

export const TransportSegmentTable: React.FC<TransportSegmentTableProps> = ({
  transportSegments,
  locations,
  getAllHotelsForLocation,
  getOptionsForRow,
  onUpdateSegment,
  onRemoveSegment,
  onLoadOptions,
  disabled = false,
  emptyMessage = 'No movement segments. Complete hotel bookings to auto-generate segments.',
}) => {
  if (transportSegments.length === 0) {
    return (
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
        {emptyMessage}
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
              Date
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Time
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              From
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Location/Hotel Name
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              To
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Location/Hotel Name
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Vehicle Type
            </th>
            <th className="border border-gray-200 p-3 text-center text-sm font-medium text-gray-700">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {transportSegments.map((seg, index) => {
            const fromHotels = seg.fromLocationId
              ? getAllHotelsForLocation(seg.fromLocationId)
              : [];
            const toHotels = seg.toLocationId
              ? getAllHotelsForLocation(seg.toLocationId)
              : [];
            const rowOptions = getOptionsForRow(index);

            return (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-200 p-3 font-medium text-gray-900">
                  {index + 1}
                </td>
                <td className="border border-gray-200 p-3">
                  <Input
                    type="date"
                    value={seg.travelDate || ''}
                    onChange={(e) =>
                      onUpdateSegment(index, 'travelDate', e.target.value)
                    }
                    disabled={disabled}
                    className="w-full"
                  />
                </td>
                <td className="border border-gray-200 p-3">
                  <Input
                    type="time"
                    value={seg.travelTime || ''}
                    onChange={(e) =>
                      onUpdateSegment(index, 'travelTime', e.target.value)
                    }
                    disabled={disabled}
                    className="w-full"
                  />
                </td>
                <td className="border border-gray-200 p-3">
                  <Select
                    value={seg.fromLocationId || undefined}
                    onValueChange={(value) => {
                      onUpdateSegment(index, 'fromLocationId', value);
                      onUpdateSegment(index, 'fromHotelId', '');
                      onLoadOptions(index, value, seg.toLocationId);
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select from" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations
                        .filter((loc) => loc.id && loc.id.trim() !== '')
                        .map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.destinationName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border border-gray-200 p-3">
                  <Select
                    value={seg.fromHotelId || '__none__'}
                    onValueChange={(value) =>
                      onUpdateSegment(index, 'fromHotelId', value === '__none__' ? '' : value)
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select hotel/location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Airport/None</SelectItem>
                      {fromHotels
                        .filter((hotel: any) => hotel.id && hotel.id.trim() !== '')
                        .map((hotel: any) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.hotelName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border border-gray-200 p-3">
                  <Select
                    value={seg.toLocationId || undefined}
                    onValueChange={(value) => {
                      onUpdateSegment(index, 'toLocationId', value);
                      onUpdateSegment(index, 'toHotelId', '');
                      onLoadOptions(index, seg.fromLocationId, value);
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select to" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations
                        .filter((loc) => loc.id && loc.id.trim() !== '')
                        .map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.destinationName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border border-gray-200 p-3">
                  <Select
                    value={seg.toHotelId || '__none__'}
                    onValueChange={(value) =>
                      onUpdateSegment(index, 'toHotelId', value === '__none__' ? '' : value)
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select hotel/location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Airport/None</SelectItem>
                      {toHotels
                        .filter((hotel: any) => hotel.id && hotel.id.trim() !== '')
                        .map((hotel: any) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.hotelName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border border-gray-200 p-3">
                  <Select
                    value={seg.vehicleType ? `${seg.vehicleType}-${seg.paxCount}` : undefined}
                    onValueChange={(value) => {
                      const chosen = rowOptions.find(
                        (t: any) => `${t.vehicleType}-${t.paxCount}` === value
                      );
                      if (chosen) {
                        onUpdateSegment(index, 'vehicleType', chosen.vehicleType);
                        onUpdateSegment(index, 'paxCount', chosen.paxCount);
                        onUpdateSegment(index, 'price', Number(chosen.price));
                      } else {
                        onUpdateSegment(index, 'vehicleType', '');
                      }
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          rowOptions.length
                            ? 'Select vehicle'
                            : 'Select from/to first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {rowOptions
                        .filter((t: any) => t.vehicleType && t.paxCount)
                        .map((t: any) => (
                          <SelectItem
                            key={`${t.id || `${t.vehicleType}-${t.paxCount}`}`}
                            value={`${t.vehicleType}-${t.paxCount}`}
                          >
                            {t.vehicleType} / {t.paxCount} — {Number(t.price).toFixed(2)} INR
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border border-gray-200 p-3 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveSegment(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

