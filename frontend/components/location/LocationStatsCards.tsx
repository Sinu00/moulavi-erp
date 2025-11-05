'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Plane, Navigation, Building2 } from 'lucide-react';
import { LocationMaster } from '@/types';

interface LocationStatsCardsProps {
  locations: LocationMaster[];
}

export default function LocationStatsCards({ locations }: LocationStatsCardsProps) {
  const totalLocations = locations.length;
  const airports = locations.filter(l => l.locationType === 'AIRPORT').length;
  const hotels = locations.filter(l => l.locationType === 'HOTEL').length;
  const ziyarat = locations.filter(l => l.locationType === 'ZIYARAT').length;
  const others = locations.filter(l => l.locationType === 'OTHERS').length;
  const activeLocations = locations.filter(l => l.isActive).length;

  const stats = [
    {
      title: 'Total Locations',
      value: totalLocations,
      icon: MapPin,
      color: 'bg-blue-100 text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Airports',
      value: airports,
      icon: Plane,
      color: 'bg-purple-100 text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Hotels',
      value: hotels,
      icon: Building2,
      color: 'bg-green-100 text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Ziyarat',
      value: ziyarat,
      icon: Navigation,
      color: 'bg-orange-100 text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Others',
      value: others,
      icon: MapPin,
      color: 'bg-gray-100 text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`h-10 w-10 rounded-full ${stat.color} flex items-center justify-center`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

