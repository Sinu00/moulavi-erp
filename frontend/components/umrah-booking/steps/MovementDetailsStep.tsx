import React, { useEffect, useState } from 'react';
import { Step3Data, TransportBooking, HotelBooking } from '@/lib/umrah/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table2 } from 'lucide-react';
import { TransportSegmentTable } from '../components/TransportSegmentTable';
import { ZiyarathTable, ZiyarathEntry } from '../components/ZiyarathTable';
import { useTransportOptions } from '../hooks/useTransportOptions';
import { generateZiyarahSegments } from '../hooks/useAutoTransportSegments';
import { JourneyFlowSummary } from '../components/JourneyFlowSummary';
import { vehicleTypeMasterAPI } from '@/lib/api';

interface MovementDetailsStepProps {
  data: Step3Data;
  onChange: (data: Partial<Step3Data>) => void;
  locations: any[];
  locationMasters?: any[];
  hotelBookings: HotelBooking[]; // From step2Data
  arrivalAirportId?: string;
  departureAirportId?: string;
  arrivalDate?: string;
  departureDate?: string;
  arrivalTime?: string;
  departureTime?: string;
  arrivalAirport?: {
    cityId?: string;
    cityMaster?: {
      id: string;
      name: string;
    };
  } | null;
  getAllHotelsForLocation: (locationId: string) => any[];
  onLoadOptions?: (index: number, fromId?: string, toId?: string) => void;
  disabled?: boolean;
}

export const MovementDetailsStep: React.FC<MovementDetailsStepProps> = ({
  data,
  onChange,
  locations,
  locationMasters = [],
  hotelBookings,
  arrivalAirportId,
  departureAirportId,
  arrivalDate,
  departureDate,
  arrivalTime,
  departureTime,
  getAllHotelsForLocation,
  onLoadOptions,
  disabled = false,
}) => {
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  
  const { loadOptionsForRow, getOptionsForRow } = useTransportOptions({
    transportSegments: data.transportSegments,
  });

  // Load vehicle types on mount
  useEffect(() => {
    const loadVehicleTypes = async () => {
      try {
        const response = await vehicleTypeMasterAPI.getActive();
        const vehicleTypesData = response.data?.data?.vehicleTypeMasters || [];
        setVehicleTypes(Array.isArray(vehicleTypesData) ? vehicleTypesData : []);
      } catch (error) {
        console.error('Error loading vehicle types:', error);
        setVehicleTypes([]);
      }
    };
    loadVehicleTypes();
  }, []);

  // Auto-generate transport segments when hotels are valid and no segments exist
  const areHotelsValid = React.useMemo(() => {
    if (hotelBookings.length === 0) return false;
    return hotelBookings.every(
      (booking) =>
        booking.locationId &&
        booking.hotelId &&
        booking.checkInDate &&
        booking.checkOutDate
    );
  }, [hotelBookings]);

  // Helper: Calculate ziyarath date (checkInDate + 2 days, skip Fridays)
  const calculateZiyarathDate = (checkInDate: string): string => {
    const base = new Date(checkInDate);
    base.setDate(base.getDate() + 2);
    // Friday (day 5) -> Saturday (day 6)
    if (base.getUTCDay() === 5) {
      base.setDate(base.getDate() + 1);
    }
    return base.toISOString().split('T')[0];
  };

  // Helper: Find ziyarath LocationMaster by city name (Makkah or Madinah)
  const findZiyarathByCity = (cityName: string): any => {
    const normalizedCity = cityName.toLowerCase().trim();
    return locationMasters.find(
      (lm: any) =>
        lm.locationType === 'ZIYARAT' &&
        (lm.city || '').toLowerCase() === normalizedCity
    );
  };

  // Auto-generate ziyaraths from hotel bookings
  React.useEffect(() => {
    if (!areHotelsValid) {
      onChange({ ziyaraths: [] });
      return;
    }

    const ziyarathEntries: ZiyarathEntry[] = [];
    const processedCities = new Set<string>(); // Track cities we've already processed

    // Check each hotel booking
    hotelBookings.forEach((booking) => {
      // Get hotel's city name from LocationMaster
      const hotelLocationMaster = locationMasters.find((lm: any) => lm.id === booking.hotelId);
      if (!hotelLocationMaster) return;

      const cityName = hotelLocationMaster.city || hotelLocationMaster.cityMaster?.name;
      if (!cityName) return;

      const normalizedCity = cityName.toLowerCase().trim();
      
      // Only process Makkah and Madinah
      if (normalizedCity !== 'makkah' && normalizedCity !== 'madinah') return;

      // Skip if we've already processed this city (avoid duplicates)
      if (processedCities.has(normalizedCity)) return;
      processedCities.add(normalizedCity);

      // Find ziyarath location for this city
      const ziyarathLocation = findZiyarathByCity(cityName);
      if (!ziyarathLocation) {
        console.warn(`[MovementDetailsStep] Ziyarath location not found for city: ${cityName}`);
        return;
      }

      // Calculate ziyarath date (checkInDate + 2 days, skip Fridays)
      const ziyarathDate = calculateZiyarathDate(booking.checkInDate);
      
      // Time: Makkah = 8:00 AM, Madinah = 2:00 PM
      const ziyarathTime = normalizedCity === 'makkah' ? '08:00' : '14:00';

      // Generate unique ID for this entry (stable: city name)
      const entryId = `ziyarath-${normalizedCity}`;

      ziyarathEntries.push({
        id: entryId,
        ziyarathId: ziyarathLocation.id,
        date: ziyarathDate,
        time: ziyarathTime,
      });
    });

    // Only update if ziyaraths are not already set or if they're different
    const currentZiyaraths = data.ziyaraths || [];
    if (currentZiyaraths.length === 0 || JSON.stringify(currentZiyaraths) !== JSON.stringify(ziyarathEntries)) {
      console.log('[MovementDetailsStep] Auto-generating ziyaraths:', ziyarathEntries);
      onChange({ ziyaraths: ziyarathEntries });
    }
  }, [
    areHotelsValid,
    hotelBookings,
    locationMasters,
    data.ziyaraths,
    onChange,
  ]);

  // Auto-generate transport segments from hotel bookings (only if no segments exist)
  React.useEffect(() => {
    // Only auto-generate when:
    // 1. Hotels are valid
    // 2. No segments exist yet
    if (
      areHotelsValid &&
      (!data.transportSegments || data.transportSegments.length === 0)
    ) {
      console.log('[MovementDetailsStep] Auto-generating transport segments from hotels');
      
      const bookings = hotelBookings || [];
      const segments: TransportBooking[] = [];

      // Helper: Get city location ID from LocationMaster ID
      // LocationMaster has cityId (CityMaster ID), we need to find the matching location
      const getCityLocationId = (locationMasterId: string): string | null => {
        const locationMaster = locationMasters.find((lm: any) => lm.id === locationMasterId);
        if (!locationMaster) {
          console.warn('[MovementDetailsStep] LocationMaster not found:', locationMasterId);
          return null;
        }
        
        const cityName = locationMaster.city || locationMaster.cityMaster?.name;
        const cityMasterId = locationMaster.cityId || locationMaster.cityMaster?.id;
        
        if (!cityName && !cityMasterId) {
          console.warn('[MovementDetailsStep] No city info in LocationMaster:', locationMaster);
          return null;
        }
        
        // Find the city location from locations array
        const cityLocation = locations.find((loc: any) => {
          // Match by city name or cityMaster ID
          return loc.city === cityName || 
                 loc.destinationName === cityName ||
                 (cityMasterId && (loc.id === cityMasterId || loc.cityId === cityMasterId));
        });
        
        if (!cityLocation) {
          console.warn('[MovementDetailsStep] City location not found for:', { cityName, cityMasterId, availableLocations: locations.map((l: any) => ({ id: l.id, city: l.city, destinationName: l.destinationName })) });
        }
        
        return cityLocation?.id || null;
      };

      // Helper: Get hotel's city location ID
      const getHotelCityLocationId = (hotelId: string): string | null => {
        const hotel = locationMasters.find((lm: any) => lm.id === hotelId);
        if (!hotel) {
          console.warn('[MovementDetailsStep] Hotel LocationMaster not found:', hotelId);
          return null;
        }
        return getCityLocationId(hotelId);
      };

      // 1) Arrival airport → first hotel
      const firstHotel = bookings[0];
      if (arrivalDate && firstHotel && arrivalAirportId) {
        // Get airport's city location ID
        const airportCityLocationId = getCityLocationId(arrivalAirportId);
        // Get hotel's city location ID (should match firstHotel.locationId, but verify)
        const hotelCityLocationId = getHotelCityLocationId(firstHotel.hotelId) || firstHotel.locationId;
        
        if (airportCityLocationId && hotelCityLocationId) {
          segments.push({
            fromLocationId: airportCityLocationId, // City ID (e.g., Jeddah)
            toLocationId: hotelCityLocationId, // City ID (e.g., Makkah)
            fromHotelId: arrivalAirportId, // Airport LocationMaster ID
            toHotelId: firstHotel.hotelId, // Hotel LocationMaster ID
            vehicleType: '',
            paxCount: 0,
            price: 0,
            travelDate: arrivalDate,
            travelTime: arrivalTime || '',
          });
        }
      }

      // 2) Inter-city moves between hotels (Hotel 1 → Hotel 2, etc.)
      for (let i = 1; i < bookings.length; i++) {
        const prev = bookings[i - 1];
        const curr = bookings[i];
        
        // Get city location IDs for both hotels
        const prevCityLocationId = getHotelCityLocationId(prev.hotelId) || prev.locationId;
        const currCityLocationId = getHotelCityLocationId(curr.hotelId) || curr.locationId;
        
        segments.push({
          fromLocationId: prevCityLocationId, // City ID
          toLocationId: currCityLocationId, // City ID
          fromHotelId: prev.hotelId, // Hotel LocationMaster ID
          toHotelId: curr.hotelId, // Hotel LocationMaster ID
          vehicleType: '',
          paxCount: 0,
          price: 0,
          travelDate: curr.checkInDate || '',
          travelTime: '',
        });
      }

      // 3) Last hotel → departure airport
      const lastHotel = bookings[bookings.length - 1];
      if (departureDate && lastHotel && departureAirportId) {
        // Get city location IDs
        const hotelCityLocationId = getHotelCityLocationId(lastHotel.hotelId) || lastHotel.locationId;
        const airportCityLocationId = getCityLocationId(departureAirportId);
        
        if (hotelCityLocationId && airportCityLocationId) {
          segments.push({
            fromLocationId: hotelCityLocationId, // City ID
            toLocationId: airportCityLocationId, // City ID
            fromHotelId: lastHotel.hotelId, // Hotel LocationMaster ID
            toHotelId: departureAirportId, // Airport LocationMaster ID
            vehicleType: '',
            paxCount: 0,
            price: 0,
            travelDate: departureDate,
            travelTime: departureTime || '',
          });
        }
      }

      // 4) Add ziyarah segments
      console.log('[MovementDetailsStep] Generating ziyarah segments...', {
        hotelBookingsCount: hotelBookings.length,
        locationsCount: locations.length,
      });
      const ziyarahSegs = generateZiyarahSegments(
        hotelBookings,
        locations,
        getAllHotelsForLocation
      );
      console.log('[MovementDetailsStep] Generated ziyarah segments:', ziyarahSegs.length, ziyarahSegs);
      
      const allSegments = [...segments, ...ziyarahSegs];
      console.log('[MovementDetailsStep] Total segments:', allSegments.length, 'Base segments:', segments.length, 'Ziyarah segments:', ziyarahSegs.length);
      onChange({ transportSegments: allSegments });
    }
  }, [
    areHotelsValid,
    data.transportSegments,
    hotelBookings,
    locations,
    locationMasters,
    arrivalDate,
    departureDate,
    arrivalTime,
    departureTime,
    arrivalAirportId,
    departureAirportId,
    getAllHotelsForLocation,
    onChange,
  ]);

  // Transport segment handlers
  const addMovementSegment = React.useCallback(() => {
    const segments = data.transportSegments || [];
    onChange({
      transportSegments: [
        ...segments,
        {
          fromLocationId: '',
          toLocationId: '',
          fromHotelId: '',
          toHotelId: '',
          vehicleType: '',
          paxCount: 0,
          price: 0,
          travelDate: '',
          travelTime: '',
        },
      ],
    });
  }, [data.transportSegments, onChange]);

  const removeMovementSegment = React.useCallback(
    (index: number) => {
      const segments = data.transportSegments || [];
      onChange({
        transportSegments: segments.filter((_, i) => i !== index),
      });
    },
    [onChange]
  );

  const updateMovementSegment = React.useCallback(
    (index: number, field: keyof TransportBooking, value: any) => {
      const segments = [...(data.transportSegments || [])];
      segments[index] = { ...segments[index], [field]: value };
      onChange({ transportSegments: segments });

      // Reload transport options when from/to location changes
      if (field === 'fromLocationId' || field === 'toLocationId') {
        loadOptionsForRow(index, segments[index].fromLocationId, segments[index].toLocationId);
      }
    },
    [data.transportSegments, onChange, loadOptionsForRow]
  );

  // Ziyarath handlers
  const updateZiyarath = React.useCallback(
    (index: number, field: keyof ZiyarathEntry, value: string) => {
      const ziyaraths = [...(data.ziyaraths || [])];
      ziyaraths[index] = { ...ziyaraths[index], [field]: value };
      onChange({ ziyaraths });
    },
    [data.ziyaraths, onChange]
  );

  const removeZiyarath = React.useCallback(
    (index: number) => {
      const ziyaraths = [...(data.ziyaraths || [])];
      ziyaraths.splice(index, 1);
      onChange({ ziyaraths });
    },
    [data.ziyaraths, onChange]
  );

  return (
    <div className="space-y-6">
      {/* Movement Details Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Movement Details</h4>
              <p className="text-sm text-gray-600 mt-1">
                Transport segments between locations. All fields are editable. Segments are auto-generated from your hotel bookings but can be modified.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMovementSegment}
              disabled={disabled}
            >
              <Table2 className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          </div>

          <TransportSegmentTable
            transportSegments={data.transportSegments || []}
            locations={locations}
            locationMasters={locationMasters}
            vehicleTypes={vehicleTypes}
            getAllHotelsForLocation={getAllHotelsForLocation}
            getOptionsForRow={getOptionsForRow}
            onUpdateSegment={updateMovementSegment}
            onRemoveSegment={removeMovementSegment}
            onLoadOptions={onLoadOptions || loadOptionsForRow}
            disabled={disabled}
          />
        </div>
      </Card>

      {/* Ziyarath Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900">Ziyarath Details</h4>
            <p className="text-sm text-gray-600 mt-1">
              Ziyarath visits are auto-generated based on your hotel bookings in Makkah and Madinah. Dates are calculated as 2 days after hotel check-in. All fields are editable.
            </p>
          </div>

          <ZiyarathTable
            ziyaraths={data.ziyaraths || []}
            locationMasters={locationMasters}
            onUpdate={updateZiyarath}
            onRemove={removeZiyarath}
            disabled={disabled}
          />
        </div>
      </Card>

      {/* Journey Overview - Below all tables */}
      <JourneyFlowSummary
        transportSegments={data.transportSegments || []}
        ziyaraths={data.ziyaraths || []}
        locations={locations}
        locationMasters={locationMasters}
      />
    </div>
  );
};
