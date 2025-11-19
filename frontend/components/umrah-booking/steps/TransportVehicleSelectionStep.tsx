'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Step4Data, Step2Data, Step1Data, Step3Data, LocationMaster } from '@/lib/umrah/types';
import { transportRouteMasterAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Truck, Loader2, Users, MapPin, Plus, Minus } from 'lucide-react';

interface TransportVehicleSelectionStepProps {
  data: Step4Data;
  step1Data: Step1Data;
  step2Data: Step2Data;
  step3Data?: Step3Data; // Optional: for individual bookings where hotels are in step3
  locationMasters?: LocationMaster[];
  onChange: (data: Partial<Step4Data>) => void;
  disabled?: boolean;
}

interface TransportOption {
  id: string;
  routeId: string;
  route: {
    id: string;
    city1: { id: string; name: string };
    city2: { id: string; name: string };
    city3?: { id: string; name: string } | null;
    city4?: { id: string; name: string } | null;
    routeType: string;
  };
  vehicleType: {
    id: string;
    vehicleName: string;
    paxCount: number;
  };
  price: number;
  isActive: boolean;
}

export const TransportVehicleSelectionStep: React.FC<TransportVehicleSelectionStepProps> = ({
  data,
  step1Data,
  step2Data,
  step3Data,
  locationMasters = [],
  onChange,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [exactMatches, setExactMatches] = useState<TransportOption[]>([]);
  const [otherOptions, setOtherOptions] = useState<TransportOption[]>([]);
  // Track selected vehicles with quantities (all options use quantity-based selection)
  const [selectedVehicles, setSelectedVehicles] = useState<Map<string, number>>(new Map());

  // Determine route from airports and hotels
  const determinedRoute = useMemo(() => {
    const cityIds: string[] = [];

    // Get arrival airport city
    const arrivalAirport = locationMasters.find(
      (lm) => lm.id === step2Data.arrivalAirportId && lm.locationType === 'AIRPORT'
    );
    if (arrivalAirport?.cityMaster?.id) {
      cityIds.push(arrivalAirport.cityMaster.id);
    }

    // Get hotel cities - check both step2Data (group bookings) and step3Data (individual bookings)
    const hotelBookings = step2Data.hotelBookings || step3Data?.hotelBookings || [];
    const hotelCities = new Set<string>();
    hotelBookings.forEach((booking) => {
      const hotel = locationMasters.find((lm) => lm.id === booking.hotelId && lm.locationType === 'HOTEL');
      if (hotel?.cityMaster?.id) {
        hotelCities.add(hotel.cityMaster.id);
      }
    });

    // Add hotel cities in order (preserve order from hotel bookings)
    hotelBookings.forEach((booking) => {
      const hotel = locationMasters.find((lm) => lm.id === booking.hotelId && lm.locationType === 'HOTEL');
      const cityId = hotel?.cityMaster?.id;
      if (cityId && !cityIds.includes(cityId)) {
        cityIds.push(cityId);
      }
    });

    // Get departure airport city - ALWAYS add at the end to complete the round trip
    // Even if it's the same as arrival airport (e.g., Jeddah → Makkah → Madinah → Jeddah)
    const departureAirport = locationMasters.find(
      (lm) => lm.id === step2Data.departureAirportId && lm.locationType === 'AIRPORT'
    );
    if (departureAirport?.cityMaster?.id) {
      cityIds.push(departureAirport.cityMaster.id);
    }

    return cityIds;
  }, [step2Data.arrivalAirportId, step2Data.departureAirportId, step2Data.hotelBookings, step3Data?.hotelBookings, locationMasters]);

  // Load transport options
  useEffect(() => {
    const loadTransportOptions = async () => {
      if (determinedRoute.length < 2 || !step2Data.passengerCount) {
        return;
      }

      setLoading(true);
      try {
        const response = await transportRouteMasterAPI.matchByCities(determinedRoute);
        const { exactMatches: exact, otherRoutes: other } = response.data;

        const passengerCount = step2Data.passengerCount || 0;

        // Helper function to convert route to TransportOption
        const createTransportOption = (route: any, transport: any): TransportOption => ({
          id: transport.id,
          routeId: route.id,
          route: {
            id: route.id,
            city1: route.city1,
            city2: route.city2,
            city3: route.city3,
            city4: route.city4,
            routeType: route.routeType,
          },
          vehicleType: transport.vehicleType,
          price: Number(transport.price),
          isActive: transport.isActive,
        });

        // Helper function to check if route matches exactly
        const routeMatchesExactly = (route: any): boolean => {
          const routeCities = [
            route.city1?.id,
            route.city2?.id,
            route.city3?.id,
            route.city4?.id,
          ].filter(Boolean);
          
          if (routeCities.length !== determinedRoute.length) return false;
          
          return routeCities.every((cityId, idx) => cityId === determinedRoute[idx]);
        };

        // Process exact matches: route matches exactly + capacity >= passenger count
        const exactOptions: TransportOption[] = [];
        (exact || []).forEach((route: any) => {
          if (!route.transports || route.transports.length === 0) return;
          
          route.transports.forEach((transport: any) => {
            if (!transport.isActive) return;
            
            const vehiclePax = transport.vehicleType?.paxCount || 0;
            // Only show if capacity >= passenger count
            if (vehiclePax >= passengerCount) {
              exactOptions.push(createTransportOption(route, transport));
            }
          });
        });

        // Process other options: fulltrip routes that don't match exactly
        const otherOptionsList: TransportOption[] = [];
        (other || []).forEach((route: any) => {
          if (!route.transports || route.transports.length === 0) return;
          // Only show fulltrip routes
          if (route.routeType !== 'fulltrip') return;
          // Skip if it matches exactly (already in exact matches)
          if (routeMatchesExactly(route)) return;
          
          route.transports.forEach((transport: any) => {
            if (transport.isActive) {
              otherOptionsList.push(createTransportOption(route, transport));
            }
          });
        });

        setExactMatches(exactOptions);
        setOtherOptions(otherOptionsList);
      } catch (error: any) {
        console.error('Error loading transport options:', error);
        toast.error('Failed to load transport options');
      } finally {
        setLoading(false);
      }
    };

    loadTransportOptions();
  }, [determinedRoute, step2Data.passengerCount]);

  // Initialize selected vehicles from data when component mounts or data changes
  useEffect(() => {
    if (data.selectedTransports && data.selectedTransports.length > 0) {
      const vehicleMap = new Map<string, number>();
      data.selectedTransports.forEach(st => {
        vehicleMap.set(st.transportId, st.quantity);
      });
      setSelectedVehicles(vehicleMap);
    } else if (data.selectedTransport) {
      // Backward compatibility: convert single selection to quantity-based
      const vehicleMap = new Map<string, number>();
      vehicleMap.set(data.selectedTransport.transportId, 1);
      setSelectedVehicles(vehicleMap);
    } else {
      // Clear selection if no data
      setSelectedVehicles(new Map());
    }
  }, [data.selectedTransports, data.selectedTransport]);

  const getRouteString = (route: TransportOption['route']) => {
    const cities = [
      route.city1?.name,
      route.city2?.name,
      route.city3?.name,
      route.city4?.name,
    ].filter(Boolean);
    // Return full city names with hyphens (e.g., "jeddah - makkah - madinah - jeddah")
    return cities.map(city => city?.toLowerCase() || '').join(' - ');
  };

  const handleQuantityChange = (transportId: string, delta: number) => {
    const currentQty = selectedVehicles.get(transportId) || 0;
    const newQty = Math.max(0, currentQty + delta);
    
    const newMap = new Map(selectedVehicles);
    if (newQty === 0) {
      newMap.delete(transportId);
    } else {
      newMap.set(transportId, newQty);
    }
    setSelectedVehicles(newMap);

    // Update parent data - always use selectedTransports format
    const allOptions = [...exactMatches, ...otherOptions];
    const selectedTransports = Array.from(newMap.entries())
      .map(([transportId, quantity]) => {
        const transport = allOptions.find(t => t.id === transportId);
        if (!transport) return null;
        return {
          routeId: transport.routeId,
          transportId: transport.id,
          vehicleTypeId: transport.vehicleType.id,
          price: transport.price,
          quantity,
        };
      })
      .filter(Boolean) as Array<{
        routeId: string;
        transportId: string;
        vehicleTypeId: string;
        price: number;
        quantity: number;
      }>;

    onChange({
      selectedTransports: selectedTransports.length > 0 ? selectedTransports : undefined,
      selectedTransport: undefined, // Always clear single selection format
    });
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-600">Loading transport options...</span>
      </div>
    );
  }

  if (determinedRoute.length < 2) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          Please complete the previous steps (airports and hotels) to see transport options.
        </p>
      </div>
    );
  }

  if (!step2Data.passengerCount) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          Please enter the number of passengers in Step 2 to see transport options.
        </p>
      </div>
    );
  }

  const routeDisplay = determinedRoute.map((cityId, idx) => {
    const city = locationMasters.find(lm => lm.cityMaster?.id === cityId);
    return city?.cityMaster?.name || city?.city || `City ${idx + 1}`;
  }).join(' → ');

  const allOptions = [...exactMatches, ...otherOptions];

  if (allOptions.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          No transport options available for your route. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Route Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <MapPin className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Your Journey Route</h3>
            <p className="text-base font-medium text-gray-900">{routeDisplay}</p>
            <p className="text-sm text-gray-600 mt-1">
              {step2Data.passengerCount || 0} Passengers
            </p>
          </div>
        </div>
      </div>

      {/* Exact Route Matches */}
      {exactMatches.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Exact Route Matches
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {exactMatches.map((transport) => {
              const quantity = selectedVehicles.get(transport.id) || 0;
              return (
                <SimpleTransportCard
                  key={transport.id}
                  transport={transport}
                  quantity={quantity}
                  onQuantityChange={(delta) => handleQuantityChange(transport.id, delta)}
                  getRouteString={getRouteString}
                  disabled={disabled}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Other Fulltrip Options */}
      {otherOptions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Other Fulltrip Options
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {otherOptions.map((transport) => {
              const quantity = selectedVehicles.get(transport.id) || 0;
              return (
                <SimpleTransportCard
                  key={transport.id}
                  transport={transport}
                  quantity={quantity}
                  onQuantityChange={(delta) => handleQuantityChange(transport.id, delta)}
                  getRouteString={getRouteString}
                  disabled={disabled}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface SimpleTransportCardProps {
  transport: TransportOption;
  quantity: number;
  onQuantityChange: (delta: number) => void;
  getRouteString: (route: TransportOption['route']) => string;
  disabled?: boolean;
}

const SimpleTransportCard: React.FC<SimpleTransportCardProps> = ({
  transport,
  quantity,
  onQuantityChange,
  getRouteString,
  disabled,
}) => {
  const routeString = getRouteString(transport.route);
  const isSelected = quantity > 0;

  return (
    <Card className={`h-full hover:shadow-lg transition-all flex flex-col ${
      isSelected 
        ? 'ring-2 ring-blue-500 border-blue-500 shadow-md bg-blue-50' 
        : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      <CardContent className="p-4 flex flex-col h-full">
        {/* Route */}
        <div className="mb-3">
          <h4 className="font-semibold text-gray-900 text-sm">
            {routeString}
          </h4>
        </div>

        {/* Vehicle Name */}
        <div className="mb-3 flex-1">
          <div className="flex items-center space-x-2">
            <Truck className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">
              {transport.vehicleType.vehicleName}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="mb-3">
          <div className="flex items-baseline space-x-1">
            <span className="text-sm text-gray-600">Price:</span>
            <span className="text-lg font-bold text-gray-900">
              ₹{transport.price.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Passenger Count */}
        <div className="mb-3">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {transport.vehicleType.paxCount} PAX
            </span>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Quantity:</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQuantityChange(-1)}
                disabled={disabled || quantity === 0}
                className="h-7 w-7 p-0"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-semibold text-gray-900 w-8 text-center">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQuantityChange(1)}
                disabled={disabled}
                className="h-7 w-7 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
