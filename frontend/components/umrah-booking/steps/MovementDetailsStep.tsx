// Simplified MovementDetailsStep using unified movements model
import React from 'react';
import { Step3Data, Step4Data, Movement, HotelBooking } from '@/lib/umrah/types';
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
  data: Step4Data; // Now Step 4 contains movements
  onChange: (data: Partial<Step4Data>) => void;
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
  step3Data?: Step3Data; // Transport selections from Step 3
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
  step3Data,
  onLoadOptions,
  disabled = false,
}) => {
  const [availableRoutes, setAvailableRoutes] = React.useState<TransportRouteMaster[]>([]);
  const [loadingRoutes, setLoadingRoutes] = React.useState(false);

  // Check if hotels are valid
  const areHotelsValid = React.useMemo(() => {
    if (hotelBookings.length === 0) return false;
    return hotelBookings.every(
      (booking) =>
        booking.cityId &&
        booking.hotelId &&
        booking.checkInDate &&
        booking.checkOutDate
    );
  }, [hotelBookings]);

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
    hotelBookings: hotelBookings,
    arrivalAirportId,
    departureAirportId,
    arrivalDate,
    departureDate,
    step3Data,
  });
  const isManualEditRef = React.useRef<boolean>(false);
  const lastGeneratedHashRef = React.useRef<string>('');

  // Reset manual edit flag when key dependencies change
  React.useEffect(() => {
    const prev = prevDepsRef.current;
    const hasChanged = 
      prev.hotelBookings !== hotelBookings ||
      prev.arrivalAirportId !== arrivalAirportId ||
      prev.departureAirportId !== departureAirportId ||
      prev.arrivalDate !== arrivalDate ||
      prev.departureDate !== departureDate ||
      prev.step3Data !== step3Data;
          
    if (hasChanged) {
      isManualEditRef.current = false;
      prevDepsRef.current = {
        hotelBookings,
        arrivalAirportId,
        departureAirportId,
        arrivalDate,
        departureDate,
        step3Data,
      };
          }
  }, [hotelBookings, arrivalAirportId, departureAirportId, arrivalDate, departureDate, step3Data]);

  // Generate movements based on selected transport routes from Step 3
  React.useEffect(() => {
    // Skip if user has manually edited movements
    if (isManualEditRef.current) {
      return;
    }

    // Only auto-generate when hotels are valid
    if (!areHotelsValid) {
      return;
    }

    if (!arrivalAirportId || !departureAirportId || !arrivalDate || !departureDate) {
      return;
        }
        
    // Only generate if transport routes are selected
    if (step3Data?.selectedTransports || step3Data?.selectedTransport) {
      const selectedRoutes = getSelectedRoutes(step3Data, availableRoutes);
      
      if (selectedRoutes.length > 0) {
        const generatedMovements = generateMovementsFromRoutes({
          hotelBookings,
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
    hotelBookings,
    arrivalAirportId,
    departureAirportId,
    arrivalDate,
    departureDate,
    arrivalTime,
    departureTime,
    locationMasters,
    findZiyarathByCity,
    step3Data,
    availableRoutes,
    onChange,
  ]);

  // Movement handlers
  const movements = (data as Step4Data).movements || [];
  
  // Check if transport routes are selected
  const hasTransportSelected = step3Data?.selectedTransports?.length > 0 || !!step3Data?.selectedTransport;
  
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
    return ((data as Step4Data).movements || [])
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
    return ((data as Step4Data).movements || [])
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
                Select transport routes in Step 3 to auto-generate movements, or add movements manually below.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Movement Details</h4>
              <p className="text-sm text-gray-600 mt-1">
                {hasTransportSelected 
                  ? 'Movements are auto-generated based on your selected transport routes. All fields are editable. Movements are sorted chronologically.'
                  : 'Add movements manually or go back to Step 3 to select transport routes for auto-generation.'}
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
            emptyMessage="No movements. Select transport routes in Step 3 to auto-generate movements, or add manually."
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
