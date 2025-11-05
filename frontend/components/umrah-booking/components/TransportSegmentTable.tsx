import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { TransportBooking, Location, Hotel as HotelType, LocationMaster } from '@/lib/umrah/types';

interface TransportSegmentTableProps {
  transportSegments: TransportBooking[];
  locations: Location[];
  locationMasters?: LocationMaster[];
  getAllHotelsForLocation: (locationId: string) => HotelType[];
  getOptionsForRow: (index: number) => any[];
  onUpdateSegment: (index: number, field: keyof TransportBooking, value: any) => void;
  onRemoveSegment: (index: number) => void;
  onLoadOptions: (index: number, fromId?: string, toId?: string) => void;
  disabled?: boolean;
  emptyMessage?: string;
}

// Helper function to truncate text
const truncateText = (text: string, maxLength: number = 15): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const TransportSegmentTable: React.FC<TransportSegmentTableProps> = ({
  transportSegments,
  locations,
  locationMasters = [],
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
    <>
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
              Location Master
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              To
            </th>
            <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
              Location Master
            </th>
            <th className="border border-gray-200 p-3 text-center text-sm font-medium text-gray-700">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {transportSegments.map((seg, index) => {
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
                      {/* Show city locations */}
                      {locations
                        .filter((loc) => loc.id && loc.id.trim() !== '')
                        .map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.destinationName}
                          </SelectItem>
                        ))}
                      {/* Also show airports from locationMasters */}
                      {locationMasters
                        .filter((loc: LocationMaster) => loc.locationType === 'AIRPORT' && loc.id && loc.id.trim() !== '')
                        .map((loc: LocationMaster) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} {loc.city ? `(${loc.city})` : ''}
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
                    <SelectTrigger className="w-full max-w-[200px] [&>span]:truncate">
                      <SelectValue placeholder="Select location master" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {locationMasters
                        .filter((loc: LocationMaster) => loc.id && loc.id.trim() !== '')
                        .map((loc: LocationMaster) => (
                          <SelectItem key={loc.id} value={loc.id} textValue={loc.name}>
                            <div className="flex flex-col w-full">
                              <span className="font-medium">{loc.name}</span>
                              <span className="text-xs text-gray-500 mt-0.5">
                                {loc.city ? `${loc.city} • ` : ''}{loc.locationType}
                              </span>
                            </div>
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
                      {/* Show city locations */}
                      {locations
                        .filter((loc) => loc.id && loc.id.trim() !== '')
                        .map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.destinationName}
                          </SelectItem>
                        ))}
                      {/* Also show airports from locationMasters */}
                      {locationMasters
                        .filter((loc: LocationMaster) => loc.locationType === 'AIRPORT' && loc.id && loc.id.trim() !== '')
                        .map((loc: LocationMaster) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} {loc.city ? `(${loc.city})` : ''}
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
                    <SelectTrigger className="w-full max-w-[200px] [&>span]:truncate">
                      <SelectValue placeholder="Select location master" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {locationMasters
                        .filter((loc: LocationMaster) => loc.id && loc.id.trim() !== '')
                        .map((loc: LocationMaster) => (
                          <SelectItem key={loc.id} value={loc.id} textValue={loc.name}>
                            <div className="flex flex-col w-full">
                              <span className="font-medium">{loc.name}</span>
                              <span className="text-xs text-gray-500 mt-0.5">
                                {loc.city ? `${loc.city} • ` : ''}{loc.locationType}
                              </span>
                            </div>
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
    </>
  );
};

