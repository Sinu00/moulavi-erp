'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, EyeOff, Truck } from 'lucide-react';

interface TransportMaster {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  vehicleType: string;
  paxCount: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fromLocation?: {
    id: string;
    destinationName: string;
    city: string;
  };
  toLocation?: {
    id: string;
    destinationName: string;
    city: string;
  };
}

interface TransportCardProps {
  transport: TransportMaster;
  onEdit: (transport: TransportMaster) => void;
  onDelete: (transport: TransportMaster) => void;
  onToggleStatus: (transport: TransportMaster) => void;
}

export default function TransportCard({ transport, onEdit, onDelete, onToggleStatus }: TransportCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center space-x-4">
        <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
          <Truck className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{transport.vehicleType}</h3>
          <p className="text-sm text-gray-500">
            {transport.fromLocation?.destinationName || 'Unknown'} → {transport.toLocation?.destinationName || 'Unknown'}
          </p>
          <p className="text-xs text-gray-400">
            {transport.paxCount} PAX • SAR {transport.price}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant={transport.isActive ? "default" : "secondary"}>
          {transport.isActive ? "Active" : "Inactive"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleStatus(transport)}
          title={transport.isActive ? "Deactivate" : "Activate"}
        >
          {transport.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(transport)}
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(transport)}
          className="text-red-600 hover:text-red-700"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
