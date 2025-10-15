'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, EyeOff, Plane } from 'lucide-react';

interface AirportMaster {
  id: string;
  airportCode: string;
  airportName: string;
  city: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AirportCardProps {
  airport: AirportMaster;
  onEdit: (airport: AirportMaster) => void;
  onDelete: (airport: AirportMaster) => void;
  onToggleStatus: (airport: AirportMaster) => void;
}

export default function AirportCard({ airport, onEdit, onDelete, onToggleStatus }: AirportCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center space-x-4">
        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
          <Plane className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{airport.airportName}</h3>
          <p className="text-sm text-gray-500">
            {airport.airportCode} • {airport.city}, {airport.country}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant={airport.isActive ? "default" : "secondary"}>
          {airport.isActive ? "Active" : "Inactive"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleStatus(airport)}
          title={airport.isActive ? "Deactivate" : "Activate"}
        >
          {airport.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(airport)}
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(airport)}
          className="text-red-600 hover:text-red-700"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
