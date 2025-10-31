'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MapPin, CheckCircle, XCircle, Globe } from 'lucide-react';
import { CountryMaster } from '@/types';

interface CountryStatsCardsProps {
  countries: CountryMaster[];
}

export default function CountryStatsCards({ countries }: CountryStatsCardsProps) {
  const totalCountries = countries.length;
  const activeCountries = countries.filter(c => c.isActive).length;
  const inactiveCountries = totalCountries - activeCountries;

  const stats = [
    {
      title: 'Total Countries',
      value: totalCountries,
      icon: Globe,
      color: 'bg-blue-100 text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Active Countries',
      value: activeCountries,
      icon: CheckCircle,
      color: 'bg-green-100 text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Inactive Countries',
      value: inactiveCountries,
      icon: XCircle,
      color: 'bg-gray-100 text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

