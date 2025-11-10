'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Power, PowerOff, Truck } from 'lucide-react';
import { TransportMaster } from '@/types';

interface TransportCardProps {
  transport: TransportMaster;
  onEdit: (transport: TransportMaster) => void;
  onDelete: (transport: TransportMaster) => void;
  onToggleStatus: (transport: TransportMaster) => void;
}

export default function TransportCard({
  transport,
  onEdit,
  onDelete,
  onToggleStatus,
}: TransportCardProps) {
  const getRouteString = () => {
    if (!transport.route) return 'N/A';
    const cities = [
      transport.route.city1?.name,
      transport.route.city2?.name,
      transport.route.city3?.name,
      transport.route.city4?.name,
    ].filter(Boolean);
    return cities.join(' → ');
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${!transport.isActive ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Truck className="h-4 w-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900">{getRouteString()}</h3>
              <Badge variant={transport.isActive ? 'default' : 'secondary'}>
                {transport.vehicleType?.vehicleName || 'N/A'}
              </Badge>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <p>Vehicle: {transport.vehicleType?.vehicleName} ({transport.vehicleType?.paxCount} PAX)</p>
              <p>Price: ₹{Number(transport.price).toLocaleString()}</p>
              <p className="text-xs">Created: {new Date(transport.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStatus(transport)}
              title={transport.isActive ? 'Deactivate' : 'Activate'}
            >
              {transport.isActive ? (
                <Power className="h-4 w-4 text-green-600" />
              ) : (
                <PowerOff className="h-4 w-4 text-gray-400" />
              )}
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
              title="Delete"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

