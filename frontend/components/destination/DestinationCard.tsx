'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, EyeOff, MapPin } from 'lucide-react';

interface DestinationMaster {
  id: string;
  destinationCode: string;
  destinationName: string;
  city: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DestinationCardProps {
  destination: DestinationMaster;
  onEdit: (destination: DestinationMaster) => void;
  onDelete: (destination: DestinationMaster) => void;
  onToggleStatus: (destination: DestinationMaster) => void;
}

export default function DestinationCard({ destination, onEdit, onDelete, onToggleStatus }: DestinationCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center space-x-4">
        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
          <MapPin className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{destination.destinationName}</h3>
          <p className="text-sm text-gray-500">
            {destination.destinationCode} • {destination.city}, {destination.country}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant={destination.isActive ? "default" : "secondary"}>
          {destination.isActive ? "Active" : "Inactive"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleStatus(destination)}
          title={destination.isActive ? "Deactivate" : "Activate"}
        >
          {destination.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(destination)}
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(destination)}
          className="text-red-600 hover:text-red-700"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
