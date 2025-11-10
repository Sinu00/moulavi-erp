'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Step4Data, Step2Data, Step1Data, LocationMaster } from '@/lib/umrah/types';
import { transportRouteMasterAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Truck, CheckCircle2, Loader2, Route, Users, MapPin, Sparkles, Info, AlertCircle } from 'lucide-react';

interface TransportVehicleSelectionStepProps {
  data: Step4Data;
  step1Data: Step1Data;
  step2Data: Step2Data;
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
  locationMasters = [],
  onChange,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [exactMatches, setExactMatches] = useState<TransportOption[]>([]);
  const [otherOptions, setOtherOptions] = useState<TransportOption[]>([]);
  const [rawRouteCounts, setRawRouteCounts] = useState<{ exact: number; other: number }>({ exact: 0, other: 0 });
  const [selectedTransportId, setSelectedTransportId] = useState<string | null>(
    data.selectedTransport?.transportId || null
  );

  // Determine route from airports and hotels
  const determinedRoute = useMemo(() => {
    const cityIds: string[] = [];

    // Get arrival airport city
    const arrivalAirport = locationMasters.find(
      (lm) => lm.id === step2Data.arrivalAirportId && lm.locationType === 'AIRPORT'
    );
    if (arrivalAirport?.cityMaster?.id) {
      cityIds.push(arrivalAirport.cityMaster.id);
    } else if (arrivalAirport?.cityId) {
      cityIds.push(arrivalAirport.cityId);
    }

    // Get hotel cities
    const hotelCities = new Set<string>();
    step2Data.hotelBookings?.forEach((booking) => {
      const hotel = locationMasters.find((lm) => lm.id === booking.hotelId && lm.locationType === 'HOTEL');
      if (hotel?.cityMaster?.id) {
        hotelCities.add(hotel.cityMaster.id);
      } else if (hotel?.cityId) {
        hotelCities.add(hotel.cityId);
      }
    });

    // Add hotel cities in order (preserve order from hotel bookings)
    step2Data.hotelBookings?.forEach((booking) => {
      const hotel = locationMasters.find((lm) => lm.id === booking.hotelId && lm.locationType === 'HOTEL');
      const cityId = hotel?.cityMaster?.id || hotel?.cityId;
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
    } else if (departureAirport?.cityId) {
      cityIds.push(departureAirport.cityId);
    }

    return cityIds;
  }, [step2Data.arrivalAirportId, step2Data.departureAirportId, step2Data.hotelBookings, locationMasters]);

  // Load transport options
  useEffect(() => {
    const loadTransportOptions = async () => {
      if (determinedRoute.length < 2 || !step1Data.passengerCount) {
        return;
      }

      setLoading(true);
      try {
        const response = await transportRouteMasterAPI.matchByCities(determinedRoute);
        const { exactMatches: exact, otherRoutes: other } = response.data;

        // Filter transports by PAX capacity
        // Logic: vehicle.paxCount >= passengerCount (e.g., 30 PAX vehicle can handle 20 passengers)
        const passengerCount = step1Data.passengerCount || 0;

        const filterByPax = (routes: any[]): TransportOption[] => {
          const options: TransportOption[] = [];
          routes.forEach((route) => {
            if (!route.transports || route.transports.length === 0) {
              return;
            }
            route.transports?.forEach((transport: any) => {
              const vehiclePax = transport.vehicleType?.paxCount || 0;
              
              // Filter: vehicle PAX capacity must be >= passenger count
              // Example: 30 PAX vehicle can handle 20 passengers (30 >= 20 = true)
              if (vehiclePax >= passengerCount && transport.isActive) {
                options.push({
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
              }
            });
          });
          return options;
        };

        const exactOptions = filterByPax(exact || []);
        const otherOptionsList = filterByPax(other || []);

        // Sort exact matches by PAX (closest to passenger count)
        exactOptions.sort((a, b) => {
          const diffA = Math.abs(a.vehicleType.paxCount - passengerCount);
          const diffB = Math.abs(b.vehicleType.paxCount - passengerCount);
          return diffA - diffB;
        });

        // Sort other options by PAX (ascending - smallest that fits first)
        otherOptionsList.sort((a, b) => a.vehicleType.paxCount - b.vehicleType.paxCount);

        setExactMatches(exactOptions);
        setOtherOptions(otherOptionsList);
        
        // Store raw route counts for debugging
        setRawRouteCounts({
          exact: exact?.length || 0,
          other: other?.length || 0
        });
      } catch (error: any) {
        console.error('Error loading transport options:', error);
        toast.error('Failed to load transport options');
      } finally {
        setLoading(false);
      }
    };

    loadTransportOptions();
  }, [determinedRoute, step1Data.passengerCount]);

  const getRouteString = (route: TransportOption['route']) => {
    const cities = [
      route.city1?.name,
      route.city2?.name,
      route.city3?.name,
      route.city4?.name,
    ].filter(Boolean);
    return cities.join(' → ');
  };

  const handleSelectTransport = (transport: TransportOption) => {
    setSelectedTransportId(transport.id);
    onChange({
      selectedTransport: {
        routeId: transport.routeId,
        transportId: transport.id,
        vehicleTypeId: transport.vehicleType.id,
        price: transport.price,
      },
    });
  };

  const getRouteTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      citytocity: 'City to City',
      airporttocity: 'Airport to City',
      citytoairport: 'City to Airport',
      tripandtour: 'Trip and Tour',
      fulltrip: 'Full Trip',
    };
    return labels[type] || type;
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

  if (!step1Data.passengerCount) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          Please enter the number of passengers in Step 1 to see transport options.
        </p>
      </div>
    );
  }

  const routeDisplay = determinedRoute.map((cityId, idx) => {
    const city = locationMasters.find(lm => (lm.cityMaster?.id || lm.cityId) === cityId);
    return city?.cityMaster?.name || city?.city || `City ${idx + 1}`;
  }).join(' → ');

  const allOptions = [...exactMatches, ...otherOptions];

  if (allOptions.length === 0) {
    // Debug: Check if we got any routes from API (before filtering)
    const hasRoutes = rawRouteCounts.exact > 0 || rawRouteCounts.other > 0;
    
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Transport Options Available
              </h3>
              <p className="text-gray-700 mb-4">
                We couldn't find any transport vehicles for your route with <strong>{step1Data.passengerCount} passengers</strong>.
              </p>
              
              {hasRoutes ? (
                <div className="bg-white border border-orange-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-start space-x-2">
                    <Info className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">Routes Found, But No Suitable Vehicles</p>
                      <p className="text-sm text-gray-600">
                        Routes matching your cities were found, but none of the vehicles have sufficient capacity for {step1Data.passengerCount} passengers.
                      </p>
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                        <p className="font-medium mb-1">How it works:</p>
                        <p>We only show vehicles where <strong>vehicle capacity ≥ your passenger count</strong>.</p>
                        <p className="mt-1">For example: A 30-PAX vehicle can handle 20 passengers, but a 15-PAX vehicle cannot.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">No Routes Match Your Journey</p>
                      <p className="text-sm text-gray-600">
                        The route <strong>{routeDisplay}</strong> hasn't been configured in our system yet.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-4 flex items-center space-x-2 text-sm text-gray-600">
                <AlertCircle className="h-4 w-4" />
                <span>Please contact support or adjust your route/hotels to find available options.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Route Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Journey Route</h3>
            <p className="text-base font-medium text-gray-900 mb-3">
              {routeDisplay}
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1.5 text-gray-600">
                <Users className="h-4 w-4" />
                <span><strong className="text-gray-900">{step1Data.passengerCount}</strong> Passengers</span>
              </div>
              <div className="flex items-center space-x-1.5 text-gray-600">
                <Route className="h-4 w-4" />
                <span>{determinedRoute.length} Cities</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Options Section - Scrollable */}
      {exactMatches.length > 0 && (
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recommended Options</h3>
                <p className="text-xs text-gray-500">Perfect matches for your route</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-300">Best Match</Badge>
          </div>
          <div className="max-h-96 overflow-y-auto pr-2">
            <div className="grid grid-cols-4 gap-4">
              {exactMatches.map((transport) => (
                <TransportOptionCard
                  key={transport.id}
                  transport={transport}
                  isSelected={selectedTransportId === transport.id}
                  isSuggested={true}
                  passengerCount={step1Data.passengerCount}
                  onSelect={() => handleSelectTransport(transport)}
                  getRouteString={getRouteString}
                  getRouteTypeLabel={getRouteTypeLabel}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Available Options Section - Grid Layout */}
      {allOptions.length > 0 && (
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Truck className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">All Available Options</h3>
                <p className="text-xs text-gray-500">All transport options that can accommodate your group</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {allOptions.length} {allOptions.length === 1 ? 'option' : 'options'}
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {allOptions.map((transport) => (
              <TransportOptionCard
                key={transport.id}
                transport={transport}
                isSelected={selectedTransportId === transport.id}
                isSuggested={exactMatches.some(m => m.id === transport.id)}
                passengerCount={step1Data.passengerCount}
                onSelect={() => handleSelectTransport(transport)}
                getRouteString={getRouteString}
                getRouteTypeLabel={getRouteTypeLabel}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface TransportOptionCardProps {
  transport: TransportOption;
  isSelected: boolean;
  isSuggested: boolean;
  passengerCount: number;
  onSelect: () => void;
  getRouteString: (route: TransportOption['route']) => string;
  getRouteTypeLabel: (type: string) => string;
  disabled?: boolean;
}

const TransportOptionCard: React.FC<TransportOptionCardProps> = ({
  transport,
  isSelected,
  isSuggested,
  passengerCount,
  onSelect,
  getRouteString,
  getRouteTypeLabel,
  disabled,
}) => {
  const routeString = getRouteString(transport.route);
  const routeParts = routeString.split(' → ');
  const capacityUtilization = (passengerCount / transport.vehicleType.paxCount) * 100;
  const hasExtraCapacity = transport.vehicleType.paxCount > passengerCount;
  const capacityColor = capacityUtilization > 90 ? 'text-orange-600' : capacityUtilization > 70 ? 'text-yellow-600' : 'text-green-600';

  return (
    <Card className={`h-full hover:shadow-lg transition-all cursor-pointer flex flex-col ${
      isSelected 
        ? 'ring-2 ring-red-500 border-red-500 shadow-md bg-red-50' 
        : isSuggested 
        ? 'bg-green-50 border-green-300 hover:border-green-400' 
        : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      <CardContent className="p-4 flex flex-col h-full">
        {/* Route Header */}
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-2">
            <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
              isSuggested ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Route className={`h-3 w-3 ${isSuggested ? 'text-green-600' : 'text-gray-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm truncate">
                {routeParts.length > 2 
                  ? `${routeParts[0]} → ${routeParts[routeParts.length - 1]}`
                  : routeString
                }
              </h4>
            </div>
            {isSuggested && (
              <Badge className="bg-green-100 text-green-800 border-green-300 text-xs font-medium flex-shrink-0">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                Best
              </Badge>
            )}
          </div>
          {routeParts.length > 2 && (
            <p className="text-xs text-gray-500 ml-8 truncate" title={routeString}>
              {routeString}
            </p>
          )}
          <Badge variant="outline" className="text-xs border-gray-300 mt-1 ml-8">
            {getRouteTypeLabel(transport.route.routeType)}
          </Badge>
        </div>

        {/* Vehicle & Capacity Info */}
        <div className="space-y-2 mb-3 flex-1">
          <div className="flex items-center space-x-2">
            <Truck className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-600">Vehicle:</span>
            <span className="text-sm font-semibold text-gray-900">{transport.vehicleType.vehicleName}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-600">Capacity:</span>
            <span className="text-sm font-semibold text-gray-900">{transport.vehicleType.paxCount} PAX</span>
            {hasExtraCapacity && (
              <span className={`text-xs font-medium ${capacityColor} ml-1`}>
                ({Math.round(capacityUtilization)}%)
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="pt-3 border-t border-gray-200 mb-3">
          <div className="flex items-baseline space-x-1">
            <span className="text-xs text-gray-600">Total:</span>
            <span className="text-lg font-bold text-gray-900">
              ₹{transport.price.toLocaleString('en-IN')}
            </span>
          </div>
          {passengerCount > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              ₹{Math.round(transport.price / passengerCount).toLocaleString('en-IN')}/person
            </p>
          )}
        </div>

        {/* Select Button */}
        <Button
          variant={isSelected ? 'default' : isSuggested ? 'default' : 'outline'}
          size="sm"
          onClick={onSelect}
          disabled={disabled || isSelected}
          className={`w-full ${
            isSelected 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : isSuggested
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          {isSelected ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Selected
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Select
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

