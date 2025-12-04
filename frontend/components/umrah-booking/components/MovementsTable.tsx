// Unified Movements Table - displays all movements (transport + ziyarath) in one table
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { Movement, LocationMaster } from '@/lib/umrah/types';

interface MovementsTableProps {
  movements: Movement[];
  locationMasters: LocationMaster[];
  onUpdateMovement: (index: number, field: keyof Movement, value: any) => void;
  onRemoveMovement: (index: number) => void;
  onAddMovement?: (index: number) => void; // Add movement after this index
  disabled?: boolean;
  emptyMessage?: string;
}

export const MovementsTable: React.FC<MovementsTableProps> = ({
  movements,
  locationMasters,
  onUpdateMovement,
  onRemoveMovement,
  onAddMovement,
  disabled = false,
  emptyMessage = 'No movements. Complete hotel bookings to auto-generate movements.',
}) => {
  // Get location name by ID
  const getLocationName = (locationId: string): string => {
    const location = locationMasters.find((lm) => lm.id === locationId);
    return location?.name || locationId;
  };

  // Get city name from location
  const getCityName = (locationId: string): string | null => {
    const location = locationMasters.find((lm) => lm.id === locationId);
    return location?.city || location?.cityMaster?.name || null;
  };

  // Check if location city is Madinah (case-insensitive)
  const isMadinahCity = (locationId: string): boolean => {
    const cityName = getCityName(locationId);
    if (!cityName) return false;
    const normalized = cityName.toLowerCase().trim();
    return normalized === 'madinah' || normalized === 'madina' || normalized === 'medina';
  };

  // Get all locations for dropdown
  const getAllLocations = () => {
    return locationMasters.filter((lm) => 
      lm.locationType === 'HOTEL' || 
      lm.locationType === 'AIRPORT' || 
      lm.locationType === 'ZIYARAT'
    );
  };

  if (movements.length === 0) {
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
              Type
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
              To
            </th>
            <th className="border border-gray-200 p-3 text-center text-sm font-medium text-gray-700">
              Viabadr
            </th>
            <th className="border border-gray-200 p-3 text-center text-sm font-medium text-gray-700">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {movements.map((movement, index) => (
            <tr key={movement.id || index} className="hover:bg-gray-50">
              <td className="border border-gray-200 p-3 font-medium text-gray-900">
                {index + 1}
              </td>
              <td className="border border-gray-200 p-3">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    movement.type === 'ziyarath'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {movement.type === 'ziyarath' ? 'Ziyarath' : 'Transport'}
                </span>
              </td>
              <td className="border border-gray-200 p-3">
                <Input
                  type="date"
                  value={movement.date || ''}
                  onChange={(e) => onUpdateMovement(index, 'date', e.target.value)}
                  disabled={disabled}
                  className="w-full"
                />
              </td>
              <td className="border border-gray-200 p-3">
                <Input
                  type="time"
                  value={movement.time || ''}
                  onChange={(e) => onUpdateMovement(index, 'time', e.target.value)}
                  disabled={disabled}
                  className="w-full"
                />
              </td>
              <td className="border border-gray-200 p-3">
                <Select
                  value={movement.fromLocationId || ''}
                  onValueChange={(value) => onUpdateMovement(index, 'fromLocationId', value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllLocations().map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} ({loc.locationType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="border border-gray-200 p-3">
                <Select
                  value={movement.toLocationId || ''}
                  onValueChange={(value) => onUpdateMovement(index, 'toLocationId', value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select location">
                      {movement.toLocationId && (() => {
                        const location = locationMasters.find(lm => lm.id === movement.toLocationId);
                        const cityName = location?.city || location?.cityMaster?.name || '';
                        // If viabadrOverride is active, always show Viabadr for "To" city
                        const displayCity = movement.viabadrOverride ? 'Viabadr' : cityName;
                        return location ? `${location.name} (${displayCity})` : '';
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {getAllLocations().map((loc) => {
                      const cityName = loc.city || loc.cityMaster?.name || '';
                      // If viabadrOverride is active, always show Viabadr for "To" city in dropdown
                      const displayCity = movement.viabadrOverride ? 'Viabadr' : cityName;
                      return (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name} ({displayCity})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </td>
              <td className="border border-gray-200 p-3 text-center">
                {(isMadinahCity(movement.fromLocationId) || isMadinahCity(movement.toLocationId)) && (
                  <Button
                    variant={movement.viabadrOverride ? "default" : "outline"}
                    size="sm"
                    onClick={() => onUpdateMovement(index, 'viabadrOverride', !movement.viabadrOverride)}
                    disabled={disabled}
                    className={movement.viabadrOverride ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                    title={movement.viabadrOverride ? "Change 'To' city back to Madinah" : "Change 'To' city to Viabadr (only affects 'To' location)"}
                  >
                    Viabadr
                  </Button>
                )}
              </td>
              <td className="border border-gray-200 p-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  {onAddMovement && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAddMovement(index)}
                      disabled={disabled}
                      className="text-blue-600 hover:text-blue-700"
                      title="Add movement below"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveMovement(index)}
                    disabled={disabled}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

