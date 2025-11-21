'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Step4Data, Step2Data, Step1Data, Step3Data, LocationMaster } from '@/lib/umrah/types';
import { transportRouteMasterAPI, transportMasterAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Truck, Loader2, Users, MapPin, Plus, Minus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TransportRouteMaster, TransportMaster, RouteType } from '@/types';

interface TransportVehicleSelectionStepProps {
  data: Step4Data;
  step1Data: Step1Data;
  step2Data: Step2Data;
  step3Data?: Step3Data; // Optional: for individual bookings where hotels are in step3
  locationMasters?: LocationMaster[];
  onChange: (data: Partial<Step4Data>) => void;
  disabled?: boolean;
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
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingTransports, setLoadingTransports] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeTypeFilter, setRouteTypeFilter] = useState<RouteType | 'all'>('all');
  const [availableRoutes, setAvailableRoutes] = useState<TransportRouteMaster[]>([]);
  const [routeTransports, setRouteTransports] = useState<TransportMaster[]>([]);
  // Track selected vehicles with quantities
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

  // Helper function to format route display
  const formatRouteDisplay = (route: TransportRouteMaster): string => {
    const cities = [
      route.city1?.name,
      route.city2?.name,
      route.city3?.name,
      route.city4?.name,
    ].filter(Boolean);
    const routeString = cities.join(' → ');
    // Format routeType: fulltrip -> Full Trip, airporttocity -> Airport To City, etc.
    const routeTypeLabel = route.routeType
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capital letters
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `${routeString} (${routeTypeLabel})`;
  };

  // Helper function to find route matching determined cities
  const findRouteByCities = (routes: TransportRouteMaster[], cityIds: string[]): TransportRouteMaster | null => {
    return routes.find(route => {
      const routeCities = [
        route.city1Id,
        route.city2Id,
        route.city3Id,
        route.city4Id,
      ].filter(Boolean);
      
      if (routeCities.length !== cityIds.length) return false;
      
      return routeCities.every((cityId, idx) => cityId === cityIds[idx]);
    }) || null;
  };

  // Load all active routes
  useEffect(() => {
    const loadRoutes = async () => {
      setLoadingRoutes(true);
      try {
        const response = await transportRouteMasterAPI.getActive();
        const routes: TransportRouteMaster[] = response.data.transportRouteMasters || [];
        setAvailableRoutes(routes);

        // Auto-select determined route if it exists
        if (determinedRoute.length >= 2) {
          const matchingRoute = findRouteByCities(routes, determinedRoute);
          if (matchingRoute) {
            setSelectedRouteId(matchingRoute.id);
          }
        }
      } catch (error: any) {
        console.error('Error loading routes:', error);
        toast.error('Failed to load routes');
      } finally {
        setLoadingRoutes(false);
      }
    };

    loadRoutes();
  }, []);

  // Filter routes by routeType
  const filteredRoutes = useMemo(() => {
    if (routeTypeFilter === 'all') {
      return availableRoutes;
    }
    return availableRoutes.filter(route => route.routeType === routeTypeFilter);
  }, [availableRoutes, routeTypeFilter]);

  // Load transports when route is selected
  useEffect(() => {
    const loadTransports = async () => {
      if (!selectedRouteId) {
        setRouteTransports([]);
        setSelectedVehicles(new Map()); // Clear selections when no route is selected
        return;
      }

      setLoadingTransports(true);
      try {
        const response = await transportMasterAPI.getByRoute(selectedRouteId);
        const transports: TransportMaster[] = response.data.transportMasters || [];
        setRouteTransports(transports);
        
        // Filter selectedVehicles to only include transports that are still in the new route
        setSelectedVehicles(prev => {
          const filtered = new Map<string, number>();
          prev.forEach((quantity, transportId) => {
            if (transports.some(t => t.id === transportId)) {
              filtered.set(transportId, quantity);
            }
          });
          return filtered;
        });
      } catch (error: any) {
        console.error('Error loading transports:', error);
        toast.error('Failed to load transport vehicles');
        setRouteTransports([]);
        setSelectedVehicles(new Map());
      } finally {
        setLoadingTransports(false);
      }
    };

    loadTransports();
  }, [selectedRouteId]);

  // Initialize selected vehicles from data when component mounts or data changes
  useEffect(() => {
    if (data.selectedTransports && data.selectedTransports.length > 0) {
      const vehicleMap = new Map<string, number>();
      data.selectedTransports.forEach(st => {
        vehicleMap.set(st.transportId, st.quantity);
      });
      setSelectedVehicles(vehicleMap);
      
      // Set the route ID from the first selected transport if available
      if (data.selectedTransports[0]?.routeId && !selectedRouteId) {
        setSelectedRouteId(data.selectedTransports[0].routeId);
      }
    } else if (data.selectedTransport) {
      // Backward compatibility: convert single selection to quantity-based
      const vehicleMap = new Map<string, number>();
      vehicleMap.set(data.selectedTransport.transportId, 1);
      setSelectedVehicles(vehicleMap);
    } else {
      // Clear selection if no data
      setSelectedVehicles(new Map());
    }
  }, [data.selectedTransports, data.selectedTransport, selectedRouteId]);

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
    const selectedTransports = Array.from(newMap.entries())
      .map(([transportId, quantity]) => {
        const transport = routeTransports.find(t => t.id === transportId);
        if (!transport || !transport.vehicleType) return null;
        return {
          routeId: transport.routeId,
          transportId: transport.id,
          vehicleTypeId: transport.vehicleType.id,
          price: Number(transport.price),
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


  if (loadingRoutes) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-600">Loading routes...</span>
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

  const routeDisplay = determinedRoute.map((cityId, idx) => {
    const city = locationMasters.find(lm => lm.cityMaster?.id === cityId);
    return city?.cityMaster?.name || city?.city || `City ${idx + 1}`;
  }).join(' → ');

  const selectedRoute = availableRoutes.find(r => r.id === selectedRouteId);
  const routeNotFound = determinedRoute.length >= 2 && !selectedRoute;

  return (
    <div className="space-y-4">
      {/* Route Summary */}
      <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
        <MapPin className="h-5 w-5 text-red-600" />
        <div>
          <p className="text-sm font-medium text-gray-900">{routeDisplay}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {step2Data.passengerCount || 0} Passengers
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700">Filter by Route Type</label>
          <Select
            value={routeTypeFilter}
            onValueChange={(value) => setRouteTypeFilter(value as RouteType | 'all')}
            disabled={disabled || loadingRoutes}
          >
            <SelectTrigger className="w-full border-gray-300">
              <SelectValue placeholder="Select route type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Route Types</SelectItem>
              <SelectItem value="fulltrip">Full Trip</SelectItem>
              <SelectItem value="airporttocity">Airport to City</SelectItem>
              <SelectItem value="citytocity">City to City</SelectItem>
              <SelectItem value="citytoairport">City to Airport</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700">Select Route</label>
          <Select
            value={selectedRouteId || ''}
            onValueChange={(value) => setSelectedRouteId(value || null)}
            disabled={disabled || loadingRoutes || filteredRoutes.length === 0}
          >
            <SelectTrigger className="w-full border-gray-300">
              <SelectValue placeholder="Select a route" />
            </SelectTrigger>
            <SelectContent>
              {filteredRoutes.length === 0 ? (
                <SelectItem value="__no_routes__" disabled>
                  No routes available
                </SelectItem>
              ) : (
                filteredRoutes.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    {formatRouteDisplay(route)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {routeNotFound && (
            <p className="text-xs text-red-600 mt-1">
              No exact route found. Please select a route from the dropdown above.
            </p>
          )}
        </div>
      </div>

      {/* Transport Table */}
      {selectedRouteId && (
        <>
          {loadingTransports ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-red-600" />
              <span className="ml-2 text-sm text-gray-600">Loading transport vehicles...</span>
            </div>
          ) : routeTransports.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No transport vehicles available for this route.</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium text-gray-700">Vehicle Name</TableHead>
                    <TableHead className="font-medium text-gray-700">Capacity</TableHead>
                    <TableHead className="font-medium text-gray-700">Price</TableHead>
                    <TableHead className="font-medium text-gray-700">Quantity</TableHead>
                    <TableHead className="font-medium text-gray-700 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routeTransports.map((transport) => {
                    if (!transport.vehicleType) return null;
                    const quantity = selectedVehicles.get(transport.id) || 0;
                    const price = Number(transport.price);
                    const total = price * quantity;
                    const isSelected = quantity > 0;
                    return (
                      <TableRow 
                        key={transport.id}
                        className={isSelected ? 'bg-red-50' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Truck className={`h-4 w-4 ${isSelected ? 'text-red-600' : 'text-gray-400'}`} />
                            <span className="font-medium text-gray-900">{transport.vehicleType.vehicleName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{transport.vehicleType.paxCount} PAX</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-900">₹{price.toLocaleString('en-IN')}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(transport.id, -1)}
                              disabled={disabled || quantity === 0}
                              className="h-7 w-7 p-0 border-gray-300 hover:bg-red-50 hover:border-red-300"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className={`text-sm font-medium w-8 text-center ${
                              isSelected ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(transport.id, 1)}
                              disabled={disabled}
                              className="h-7 w-7 p-0 border-gray-300 hover:bg-red-50 hover:border-red-300"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${
                            isSelected ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            ₹{total.toLocaleString('en-IN')}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

