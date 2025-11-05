'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, EyeOff, Route } from 'lucide-react';
import { FullTripMaster } from '@/types';

interface FullTripCardProps {
  trip: FullTripMaster;
  onEdit: (trip: FullTripMaster) => void;
  onDelete: (trip: FullTripMaster) => void;
  onToggleStatus: (trip: FullTripMaster) => void;
}

export default function FullTripCard({ trip, onEdit, onDelete, onToggleStatus }: FullTripCardProps) {
  // Build route string: FromCity → ToCity1 → ToCity2 → ...
  const getRouteString = () => {
    const fromCity = trip.fromCity?.name || 'Unknown';
    const toCities = (trip.toCities || [])
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
      .map(tc => tc.city?.name || 'Unknown');
    
    return [fromCity, ...toCities].join(' → ');
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center space-x-4 flex-1">
        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
          <Route className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900">{trip.vehicleType?.vehicleName || 'Unknown Vehicle'}</h3>
          <p className="text-sm text-gray-500 truncate">
            {getRouteString()}
          </p>
          <p className="text-xs text-gray-400">
            {trip.vehicleType?.paxCount || 0} PAX • INR {trip.price.toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant={trip.isActive ? "default" : "secondary"}>
          {trip.isActive ? "Active" : "Inactive"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleStatus(trip)}
          title={trip.isActive ? "Deactivate" : "Activate"}
        >
          {trip.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(trip)}
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(trip)}
          className="text-red-600 hover:text-red-700"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

