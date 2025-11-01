'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Car } from 'lucide-react';

interface VehicleTypeMaster {
  id: string;
  vehicleName: string;
  paxCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VehicleTypeCardProps {
  vehicleType: VehicleTypeMaster;
  onEdit: (vehicleType: VehicleTypeMaster) => void;
  onDelete: (vehicleType: VehicleTypeMaster) => void;
  onToggleStatus: (id: string) => void;
}

export default function VehicleTypeCard({ 
  vehicleType, 
  onEdit, 
  onDelete,
  onToggleStatus
}: VehicleTypeCardProps) {

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
        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
          <Car className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900">{vehicleType.vehicleName}</h3>
            <Badge variant={vehicleType.isActive ? 'default' : 'secondary'}>
              {vehicleType.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">PAX: {vehicleType.paxCount} passengers</p>
          {vehicleType.createdAt && (
            <p className="text-xs text-gray-400">
              Created: {formatDate(vehicleType.createdAt)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleStatus(vehicleType.id)}
          title={vehicleType.isActive ? 'Deactivate' : 'Activate'}
        >
          {vehicleType.isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(vehicleType)}
          title="Edit vehicle type"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(vehicleType)}
          className="text-red-600 hover:text-red-700"
          title="Delete vehicle type"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

