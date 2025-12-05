// Simplified MovementDetailsStep using unified movements model
import React from 'react';
import { Step3Data, Step4Data, Step5Data, Movement, HotelBooking } from '@/lib/umrah/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table2, AlertCircle } from 'lucide-react';
import { MovementsTable } from '../components/MovementsTable';
import { generateMovementsFromRoutes, getSelectedRoutes } from '@/lib/umrah/generateMovements';
import { JourneyFlowSummary } from '../components/JourneyFlowSummary';
import { transportRouteMasterAPI } from '@/lib/api';
import { TransportRouteMaster } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MovementDetailsStepProps {
  data: Step4Data | Step5Data; // Step 4 for group bookings, Step 5 for individual bookings
  onChange: (data: Partial<Step4Data> | Partial<Step5Data>) => void;
  step1Data?: any;
  step2Data?: any;
  step3Data?: Step3Data; // Transport selections from Step 3 (for group bookings)
  step4Data?: Step4Data; // Transport selections from Step 4 (for individual bookings)
  locationMasters?: any[];
  locations?: any[];
  hotelBookings?: HotelBooking[]; // From step2Data (for group bookings) or step3Data (for individual bookings)
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
  getAllHotelsForLocation?: (locationId: string) => any[];
  onLoadOptions?: (index: number, fromId?: string, toId?: string) => void;
  disabled?: boolean;
  bookingId?: string | null; // Optional booking ID for ziyarath count exclusion
}

export const MovementDetailsStep: React.FC<MovementDetailsStepProps> = ({
  data,
  onChange,
  step1Data,
  step2Data,
  step3Data,
  step4Data,
  locationMasters = [],
  locations = [],
  hotelBookings = [],
  arrivalAirportId,
  departureAirportId,
  arrivalDate,
  departureDate,
  arrivalTime,
  departureTime,
  getAllHotelsForLocation,
  onLoadOptions,
  disabled = false,
  bookingId = null,
}) => {
  const [availableRoutes, setAvailableRoutes] = React.useState<TransportRouteMaster[]>([]);
  const [loadingRoutes, setLoadingRoutes] = React.useState(false);

  // Determine if this is individual booking (movements in Step5Data) or group booking (movements in Step4Data)
  // For individual bookings: step4Data contains transport selections, step5Data contains movements
  // For group bookings: step3Data contains transport selections, step4Data contains movements
  // So if step4Data has transport selections, it's individual booking
  const isIndividualBooking = React.useMemo(() => {
    // Check if step4Data has transport selections (individual booking flow)
    if (step4Data && (step4Data.selectedTransport || (step4Data.selectedTransports && step4Data.selectedTransports.length > 0))) {
      return true;
    }
    // Check if step3Data has transport selections (group booking flow)
    if (step3Data && (step3Data.selectedTransport || (step3Data.selectedTransports && step3Data.selectedTransports.length > 0))) {
      return false;
    }
    // Default: if step4Data exists but no transport, assume individual (since we're in movements step)
    // This handles the case where transport might not be selected yet
    return !!step4Data;
  }, [step3Data, step4Data]);
  
  // Get hotel bookings: from step2Data for group bookings, from step3Data for individual bookings
  const actualHotelBookings = React.useMemo(() => {
    if (hotelBookings && hotelBookings.length > 0) return hotelBookings;
    if (step3Data?.hotelBookings && step3Data.hotelBookings.length > 0) return step3Data.hotelBookings;
    if (step2Data?.hotelBookings && step2Data.hotelBookings.length > 0) return step2Data.hotelBookings;
    return [];
  }, [hotelBookings, step2Data, step3Data]);

  // Get transport data: from step3Data for group bookings, from step4Data for individual bookings
  const transportData = React.useMemo(() => {
    if (isIndividualBooking && step4Data) {
      return step4Data;
    }
    return step3Data;
  }, [isIndividualBooking, step3Data, step4Data]);

  // Check if hotels are valid
  const areHotelsValid = React.useMemo(() => {
    if (actualHotelBookings.length === 0) return false;
    return actualHotelBookings.every(
      (booking: HotelBooking) =>
        booking.cityId &&
        booking.hotelId &&
        booking.checkInDate &&
        booking.checkOutDate
    );
  }, [actualHotelBookings]);

  // Helper: Find ziyarath LocationMaster by city name
  const findZiyarathByCity = React.useCallback((cityName: string): any => {
    const normalizedCity = cityName.toLowerCase().trim();
    return locationMasters.find(
      (lm: any) =>
        lm.locationType === 'ZIYARAT' &&
        (lm.city || '').toLowerCase() === normalizedCity
    );
  }, [locationMasters]);

  // Load available routes
  React.useEffect(() => {
    const loadRoutes = async () => {
      setLoadingRoutes(true);
      try {
        const response = await transportRouteMasterAPI.getActive();
        const routes: TransportRouteMaster[] = response.data.transportRouteMasters || [];
        setAvailableRoutes(routes);
      } catch (error: any) {
        console.error('Error loading routes:', error);
      } finally {
        setLoadingRoutes(false);
      }
    };

    loadRoutes();
  }, []);

  // Track previous dependencies to detect changes and reset manual edit flag
  const prevDepsRef = React.useRef({
    hotelBookings: actualHotelBookings,
    arrivalAirportId,
    departureAirportId,
    arrivalDate,
    departureDate,
    transportData,
  });
  const isManualEditRef = React.useRef<boolean>(false);
  const lastGeneratedHashRef = React.useRef<string>('');

  // Reset manual edit flag when key dependencies change
  React.useEffect(() => {
    const prev = prevDepsRef.current;
    const hasChanged = 
      prev.hotelBookings !== actualHotelBookings ||
      prev.arrivalAirportId !== arrivalAirportId ||
      prev.departureAirportId !== departureAirportId ||
      prev.arrivalDate !== arrivalDate ||
      prev.departureDate !== departureDate ||
      prev.transportData !== transportData;
          
    if (hasChanged) {
      isManualEditRef.current = false;
      prevDepsRef.current = {
        hotelBookings: actualHotelBookings,
        arrivalAirportId,
        departureAirportId,
        arrivalDate,
        departureDate,
        transportData,
      };
          }
  }, [actualHotelBookings, arrivalAirportId, departureAirportId, arrivalDate, departureDate, transportData]);

  // Helper: Find Jeddah City Center location (OTHERS type)
  const findJeddahCityCenter = React.useCallback((): any => {
    return locationMasters.find(
      (lm: any) =>
        lm.locationType === 'OTHERS' &&
        (lm.name?.toLowerCase().includes('jeddah') || lm.name?.toLowerCase().includes('city center')) &&
        (lm.city?.toLowerCase().includes('jeddah') || lm.cityMaster?.name?.toLowerCase().includes('jeddah'))
    );
  }, [locationMasters]);

  // Generate movements based on selected transport routes
  React.useEffect(() => {
    // Skip if user has manually edited movements
    if (isManualEditRef.current) {
      return;
    }

    // Check if transport is still selected - if not, clear movements
    const hasTransport = (transportData?.selectedTransports?.length ?? 0) > 0 || !!transportData?.selectedTransport;
    if (!hasTransport) {
      // Clear movements if no transport is selected
      if (movements.length > 0) {
        onChange({ movements: [] });
        lastGeneratedHashRef.current = '';
      }
      return;
    }

    // Check if accommodation is iqama
    const accommodationType = step3Data?.accommodationType;
    const isIqama = accommodationType === 'iqama';

    // For iqama: Generate default movement from airport to Jeddah City Center
    if (isIqama && hasTransport) {
      if (!arrivalAirportId || !arrivalDate) {
        return;
      }

      const jeddahCityCenter = findJeddahCityCenter();
      if (jeddahCityCenter) {
        const defaultMovement: Movement = {
          id: `movement-iqama-airport-to-citycenter`,
          type: 'transport',
          fromLocationId: arrivalAirportId,
          toLocationId: jeddahCityCenter.id,
          date: arrivalDate,
          time: arrivalTime || '12:00',
        };

        const movementsHash = JSON.stringify([defaultMovement].map(m => 
          `${m.type}-${m.fromLocationId}-${m.toLocationId}-${m.date}-${m.time}`
        ));

        if (movementsHash !== lastGeneratedHashRef.current) {
          lastGeneratedHashRef.current = movementsHash;
          onChange({ movements: [defaultMovement] });
        }
      }
      return; // Exit early for iqama, don't generate hotel-based movements
    }

    // For hotel bookings: Only auto-generate when hotels are valid
    if (!areHotelsValid) {
      return;
    }

    if (!arrivalAirportId || !departureAirportId || !arrivalDate || !departureDate) {
      return;
        }
        
    // Only generate if transport routes are selected
    if (hasTransport && transportData) {
      const selectedRoutes = getSelectedRoutes(transportData, availableRoutes);
      
      if (selectedRoutes.length > 0) {
        const generatedMovements = generateMovementsFromRoutes({
          hotelBookings: actualHotelBookings,
          arrivalAirportId,
          departureAirportId,
          arrivalDate,
          arrivalTime: arrivalTime || '12:00',
          departureDate,
          departureTime: departureTime || '12:00',
          locationMasters,
          findZiyarathByCity,
          selectedRoutes,
        });

        // Create a simple hash to prevent unnecessary updates
        const movementsHash = JSON.stringify(generatedMovements.map(m => 
          `${m.type}-${m.fromLocationId}-${m.toLocationId}-${m.date}-${m.time}`
        ));

        // Only update if the generated movements are different
        if (movementsHash !== lastGeneratedHashRef.current) {
          lastGeneratedHashRef.current = movementsHash;
          onChange({ movements: generatedMovements });
        }
      }
    }
  }, [
    areHotelsValid,
    actualHotelBookings,
    arrivalAirportId,
    departureAirportId,
    arrivalDate,
    departureDate,
    arrivalTime,
    departureTime,
    locationMasters,
    findZiyarathByCity,
    transportData,
    availableRoutes,
    onChange,
    step3Data,
    findJeddahCityCenter,
  ]);

  // Movement handlers - support both Step4Data (group) and Step5Data (individual)
  const movements = (data as Step4Data | Step5Data).movements || [];
  
  // Check if transport routes are selected
  const hasTransportSelected = (transportData?.selectedTransports?.length ?? 0) > 0 || !!transportData?.selectedTransport;
  
  // Determine the transport step number for messages
  const transportStepNumber = isIndividualBooking ? 4 : 3;
  
  const addMovement = React.useCallback(() => {
    isManualEditRef.current = true; // Mark as manual edit
    const newMovement: Movement = {
      id: `movement-${Date.now()}`,
      type: 'transport',
          fromLocationId: '',
          toLocationId: '',
      date: '',
      time: '12:00',
    };
    onChange({ movements: [...movements, newMovement] });
  }, [movements, onChange]);

  const removeMovement = React.useCallback(
    (index: number) => {
      isManualEditRef.current = true; // Mark as manual edit
      const updatedMovements = [...movements];
      updatedMovements.splice(index, 1);
      onChange({ movements: updatedMovements });
    },
    [movements, onChange]
  );

  const updateMovement = React.useCallback(
    (index: number, field: keyof Movement, value: any) => {
      isManualEditRef.current = true; // Mark as manual edit
      const updatedMovements = [...movements];
      updatedMovements[index] = { ...updatedMovements[index], [field]: value };
      onChange({ movements: updatedMovements });
    },
    [movements, onChange]
  );

  const addMovementAfter = React.useCallback(
    (index: number) => {
      isManualEditRef.current = true; // Mark as manual edit
      const newMovement: Movement = {
        id: `movement-${Date.now()}`,
        type: 'transport',
        fromLocationId: '',
        toLocationId: '',
        date: '',
        time: '12:00',
      };
      const updatedMovements = [...movements];
      updatedMovements.splice(index + 1, 0, newMovement);
      onChange({ movements: updatedMovements });
    },
    [movements, onChange]
  );

  // Convert movements to old format for JourneyFlowSummary (backward compatibility)
  const getTransportSegmentsForSummary = () => {
    return (movements || [])
      .filter((m) => m.type === 'transport')
      .map((m) => ({
        fromLocationId: m.fromLocationId,
        toLocationId: m.toLocationId,
        fromHotelId: m.fromLocationId,
        toHotelId: m.toLocationId,
        travelDate: m.date,
        travelTime: m.time,
        paxCount: m.paxCount || 0,
        price: m.price || 0,
      }));
  };

  const getZiyarathsForSummary = () => {
    return (movements || [])
      .filter((m) => m.type === 'ziyarath')
      .map((m) => ({
        id: m.id,
        ziyarathId: m.toLocationId,
        date: m.date,
        time: m.time,
      }));
  };

  return (
    <div className="space-y-6">
      {/* Unified Movements Table */}
      <Card className="p-6">
        <div className="space-y-4">
          {!hasTransportSelected && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select transport routes in Step {transportStepNumber} to auto-generate movements, or add movements manually below.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Movement Details</h4>
              <p className="text-sm text-gray-600 mt-1">
                {hasTransportSelected 
                  ? 'Movements are auto-generated based on your selected transport routes. All fields are editable. Movements are sorted chronologically.'
                  : `Add movements manually or go back to Step ${transportStepNumber} to select transport routes for auto-generation.`}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMovement}
              disabled={disabled}
            >
              <Table2 className="h-4 w-4 mr-2" />
              Add Movement
            </Button>
          </div>

          <MovementsTable
            movements={movements}
            locationMasters={locationMasters}
            onUpdateMovement={updateMovement}
            onRemoveMovement={removeMovement}
            onAddMovement={addMovementAfter}
            disabled={disabled}
            emptyMessage={`No movements. Select transport routes in Step ${transportStepNumber} to auto-generate movements, or add manually.`}
            bookingId={bookingId}
          />
        </div>
      </Card>

      {/* Journey Overview */}
      <JourneyFlowSummary
        transportSegments={getTransportSegmentsForSummary()}
        ziyaraths={getZiyarathsForSummary()}
        locations={locations}
        locationMasters={locationMasters}
      />
    </div>
  );
};
