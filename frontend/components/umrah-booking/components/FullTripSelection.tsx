import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Route, Check } from 'lucide-react';

// FullTripMaster has been removed - using a minimal interface for compatibility
interface FullTrip {
  id: string;
  fromCityId: string;
  vehicleTypeId: string;
  price: number;
  isActive: boolean;
  fromCity?: { name: string };
  vehicleType?: { vehicleName: string; paxCount: number };
  toCities?: Array<{ cityId: string; sequenceOrder: number; city?: { name: string } }>;
}

interface FullTripSelectionProps {
  fullTrips: FullTrip[];
  selectedTripId?: string;
  onSelect: (tripId: string) => void;
  disabled?: boolean;
}

export const FullTripSelection: React.FC<FullTripSelectionProps> = ({
  fullTrips,
  selectedTripId,
  onSelect,
  disabled = false,
}) => {
  const getRouteString = (trip: FullTrip) => {
    const fromCity = trip.fromCity?.name || 'Unknown';
    const toCities = (trip.toCities || [])
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
      .map((tc) => tc.city?.name || 'Unknown');
    
    return [fromCity, ...toCities].join(' → ');
  };

  if (fullTrips.length === 0) {
    return (
      <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
        <Route className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Full Trips Available</h3>
        <p className="text-gray-500">
          No full trips found for your arrival city. You can proceed with manual movement details.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {fullTrips.map((trip) => {
          const isSelected = selectedTripId === trip.id;
          const routeString = getRouteString(trip);
          
          return (
            <Card
              key={trip.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? 'border-2 border-blue-500 bg-blue-50'
                  : 'border border-gray-200 hover:border-blue-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onSelect(trip.id)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-blue-500' : 'bg-gray-100'
                    }`}>
                      {isSelected ? (
                        <Check className="h-6 w-6 text-white" />
                      ) : (
                        <Route className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {trip.vehicleType?.vehicleName || 'Unknown Vehicle'}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {trip.vehicleType?.paxCount || 0} PAX
                      </p>
                    </div>
                  </div>
                  <Badge variant={isSelected ? 'default' : 'secondary'}>
                    {isSelected ? 'Selected' : 'Select'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Route:</p>
                    <p className="text-sm text-gray-900">{routeString}</p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">Total Price:</span>
                    <span className="text-lg font-bold text-green-600">
                      ₹{Number(trip.price).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      
      {selectedTripId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            ✓ Full trip selected. Your movement details will be automatically generated from this route.
            You can set your Ziyarat dates below.
          </p>
        </div>
      )}
    </div>
  );
};

