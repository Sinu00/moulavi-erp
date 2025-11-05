'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, MapPin } from 'lucide-react';
import { CityMaster } from '@/types';

interface CityCardProps {
  city: CityMaster;
  onEdit: (city: CityMaster) => void;
  onDelete: (city: CityMaster) => void;
  onToggleStatus: (id: string) => void;
}

export default function CityCard({ 
  city, 
  onEdit, 
  onDelete,
  onToggleStatus
}: CityCardProps) {

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
          <MapPin className="h-6 w-6 text-green-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900">{city.name}</h3>
            <Badge variant={city.isActive ? 'default' : 'secondary'}>
              {city.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">
            {city.country?.countryName || 'Unknown Country'} ({city.country?.countryCode || 'N/A'})
          </p>
          {city.createdAt && (
            <p className="text-xs text-gray-400">
              Created: {formatDate(city.createdAt)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleStatus(city.id)}
          title={city.isActive ? 'Deactivate' : 'Activate'}
        >
          {city.isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(city)}
          title="Edit city"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(city)}
          className="text-red-600 hover:text-red-700"
          title="Delete city"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

