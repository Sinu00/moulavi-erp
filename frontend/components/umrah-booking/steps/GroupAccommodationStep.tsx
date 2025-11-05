import React from 'react';
import { Button } from '@/components/ui/button';
import { Step3Data, TransportBooking } from '@/lib/umrah/types';
import { Hotel, Plus } from 'lucide-react';
import { useHotelCoverage } from '../hooks/useHotelCoverage';
import { useTransportOptions } from '../hooks/useTransportOptions';
import { useAutoTransportSegments, generateZiyarahSegments } from '../hooks/useAutoTransportSegments';
import { HotelBookingTable } from '../components/HotelBookingTable';
import { TransportSegmentTable } from '../components/TransportSegmentTable';
import { HotelCoverageIndicator } from '../components/HotelCoverageIndicator';

interface GroupAccommodationStepProps {
  data: Step3Data;
  onChange: (data: Partial<Step3Data>) => void;
  locations: any[];
  hotels: any[];
  arrivalDate: string;
  departureDate: string;
  arrivalTime: string;
  departureTime: string;
  arrivalAirportId?: string;
  departureAirportId?: string;
  onLoadHotels: (locationId: string) => void;
  getHotelsForLocation: (locationId: string) => any[];
  onAddHotelBooking: () => void;
  onRemoveHotelBooking: (index: number) => void;
  disabled?: boolean;
  locationMasters?: any[];
}

export const GroupAccommodationStep: React.FC<GroupAccommodationStepProps> = ({
  data,
  onChange,
  locations,
  hotels,
  arrivalDate,
  departureDate,
  arrivalTime,
  departureTime,
  arrivalAirportId,
  departureAirportId,
  onLoadHotels,
  getHotelsForLocation,
  onAddHotelBooking,
  onRemoveHotelBooking,
  disabled = false,
  locationMasters = [],
}) => {
  // Check if hotels are valid/complete
  const areHotelsValid = React.useMemo(() => {
    const hotelBookings = data.hotelBookings || [];
    if (hotelBookings.length === 0) return false;
    return hotelBookings.every(
      (booking) =>
        booking.locationId &&
        booking.hotelId &&
        booking.checkInDate &&
        booking.checkOutDate
    );
  }, [data.hotelBookings]);

  // Get all hotels (including ziyarah) for a location
  const getAllHotelsForLocation = React.useCallback(
    (locationId: string) => {
      return getHotelsForLocation(locationId);
    },
    [getHotelsForLocation]
  );

  // Use hooks
  const coverage = useHotelCoverage({
    arrivalDate,
    departureDate,
    hotelBookings: data.hotelBookings,
  });

  const { loadOptionsForRow, getOptionsForRow } = useTransportOptions({
    transportSegments: data.transportSegments,
  });

  // Auto-generate transport segments (excluding ziyarah which needs special handling)
  useAutoTransportSegments({
    hotelsValid: areHotelsValid,
    hotelBookings: data.hotelBookings,
    locations,
    arrivalDate,
    departureDate,
    arrivalTime,
    departureTime,
    arrivalAirportId,
    departureAirportId,
    onChange: (segments) => {
      // Merge with ziyarah segments
      const ziyarahSegs = generateZiyarahSegments(
        data.hotelBookings || [],
        locations,
        getAllHotelsForLocation
      );
      onChange({ transportSegments: [...segments, ...ziyarahSegs] });
    },
  });

  // Update hotel booking handler
  const updateHotelBooking = React.useCallback(
    (index: number, field: keyof NonNullable<typeof data.hotelBookings>[0], value: string) => {
      const updatedBookings = [...(data.hotelBookings || [])];
      updatedBookings[index] = { ...updatedBookings[index], [field]: value };

      if (field === 'locationId') {
        updatedBookings[index].hotelId = '';
        onLoadHotels(value);
      }

      if (field === 'checkOutDate' && updatedBookings[index + 1]) {
        updatedBookings[index + 1].checkInDate = value;
      }

      onChange({ hotelBookings: updatedBookings });
    },
    [data.hotelBookings, onChange, onLoadHotels]
  );

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

  return (
    <div className="space-y-6">
      {/* Hotel Bookings Section */}
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <Hotel className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Hotel Accommodation</h3>
          </div>
          <p className="text-sm text-blue-800">
            Group bookings require hotel accommodation. Please add your hotel bookings below.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Hotel Bookings</h4>
              <p className="text-sm text-gray-600">Add hotels for your accommodation</p>
              <p className="text-xs text-blue-600 mt-1">
                💡 Check-in dates are auto-filled: First hotel uses arrival date, subsequent hotels
                use previous hotel's check-out date
              </p>
              {data.hotelBookings && data.hotelBookings.length > 0 && (
                <HotelCoverageIndicator
                  coveredDays={coverage.coveredDays}
                  totalDays={coverage.totalDays}
                  coveragePercentage={coverage.coveragePercentage}
                  remainingDays={coverage.remainingDays}
                />
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddHotelBooking}
              disabled={disabled}
            >
              <Hotel className="h-4 w-4 mr-2" />
              Add Hotel
            </Button>
          </div>

          <HotelBookingTable
            hotelBookings={data.hotelBookings || []}
            locations={locations}
            hotels={hotels}
            getHotelsForLocation={getHotelsForLocation}
            onUpdateBooking={updateHotelBooking}
            onRemoveBooking={onRemoveHotelBooking}
            onAddBooking={onAddHotelBooking}
            disabled={disabled}
            showAddButton={true}
          />
        </div>
      </div>

      {/* Unified Movement Details Table - Only shown after hotels are valid */}
      {areHotelsValid && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Movement Details</h4>
              <p className="text-sm text-gray-600">
                Transportation and Ziyarah segments. All fields are editable.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMovementSegment}
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          </div>

          <TransportSegmentTable
            transportSegments={data.transportSegments || []}
            locations={locations}
            locationMasters={locationMasters}
            getAllHotelsForLocation={getAllHotelsForLocation}
            getOptionsForRow={getOptionsForRow}
            onUpdateSegment={updateMovementSegment}
            onRemoveSegment={removeMovementSegment}
            onLoadOptions={loadOptionsForRow}
            disabled={disabled}
          />
        </div>
      )}

      {/* Message when hotels are not complete */}
      {!areHotelsValid && data.hotelBookings && data.hotelBookings.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ Please complete all hotel bookings (location, hotel, check-in, check-out) to enable
            Movement Details table.
          </p>
        </div>
      )}
    </div>
  );
};
