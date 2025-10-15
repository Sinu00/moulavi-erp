'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, EyeOff, Building } from 'lucide-react';

interface HotelMaster {
  id: string;
  hotelCode: string;
  hotelName: string;
  locationId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  location?: {
    id: string;
    destinationName: string;
    city: string;
  };
}

interface HotelCardProps {
  hotel: HotelMaster;
  onEdit: (hotel: HotelMaster) => void;
  onDelete: (hotel: HotelMaster) => void;
  onToggleStatus: (hotel: HotelMaster) => void;
}

export default function HotelCard({ hotel, onEdit, onDelete, onToggleStatus }: HotelCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center space-x-4">
        <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
          <Building className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{hotel.hotelName}</h3>
          <p className="text-sm text-gray-500">
            {hotel.hotelCode} • {hotel.location?.destinationName || 'Unknown Location'}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant={hotel.isActive ? "default" : "secondary"}>
          {hotel.isActive ? "Active" : "Inactive"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleStatus(hotel)}
          title={hotel.isActive ? "Deactivate" : "Activate"}
        >
          {hotel.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(hotel)}
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(hotel)}
          className="text-red-600 hover:text-red-700"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
