'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Power, PowerOff, Route } from 'lucide-react';
import { TransportRouteMaster, RouteType } from '@/types';

interface TransportRouteCardProps {
  route: TransportRouteMaster;
  onEdit: (route: TransportRouteMaster) => void;
  onDelete: (route: TransportRouteMaster) => void;
  onToggleStatus: (route: TransportRouteMaster) => void;
}

export default function TransportRouteCard({
  route,
  onEdit,
  onDelete,
  onToggleStatus,
}: TransportRouteCardProps) {
  const getRouteTypeLabel = (type: RouteType) => {
    const labels: Record<RouteType, string> = {
      citytocity: 'City to City',
      airporttocity: 'Airport to City',
      citytoairport: 'City to Airport',
      tripandtour: 'Trip and Tour',
      fulltrip: 'Full Trip',
    };
    return labels[type];
  };

  const getRouteTypeColor = (type: RouteType) => {
    const colors: Record<RouteType, string> = {
      citytocity: 'bg-blue-100 text-blue-800',
      airporttocity: 'bg-purple-100 text-purple-800',
      citytoairport: 'bg-green-100 text-green-800',
      tripandtour: 'bg-orange-100 text-orange-800',
      fulltrip: 'bg-pink-100 text-pink-800',
    };
    return colors[type];
  };

  const getRouteString = () => {
    const cities = [
      route.city1?.name,
      route.city2?.name,
      route.city3?.name,
      route.city4?.name,
    ].filter(Boolean);
    return cities.join(' → ');
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${!route.isActive ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Route className="h-4 w-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900">{getRouteString()}</h3>
              <Badge variant={route.isActive ? 'default' : 'secondary'} className={getRouteTypeColor(route.routeType)}>
                {getRouteTypeLabel(route.routeType)}
              </Badge>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <p>Route Type: {getRouteTypeLabel(route.routeType)}</p>
              <p className="text-xs">Created: {new Date(route.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStatus(route)}
              title={route.isActive ? 'Deactivate' : 'Activate'}
            >
              {route.isActive ? (
                <Power className="h-4 w-4 text-green-600" />
              ) : (
                <PowerOff className="h-4 w-4 text-gray-400" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(route)}
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(route)}
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

