// Step 2: Travel Details Component

import React from 'react';
import { Step2Data, Airport } from '@/lib/umrah/types';
import { calculateDuration } from '@/lib/umrah/validation';
import { TravelDetailsForm } from '../components/TravelDetailsForm';
import { HotelBookingTable } from '../components/HotelBookingTable';
import { HotelCoverageIndicator } from '../components/HotelCoverageIndicator';
import { useHotelCoverage } from '../hooks/useHotelCoverage';
import { Hotel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface TravelDetailsStepProps {
  data: Step2Data;
  onChange: (data: Partial<Step2Data>) => void;
  airports: Airport[];
  disabled?: boolean;
  // Optional props for group bookings (hotel section)
  isGroupBooking?: boolean;
  locations?: any[];
  hotels?: any[];
  arrivalDate?: string;
  departureDate?: string;
  onLoadHotels?: (locationId: string) => void;
  getHotelsForLocation?: (locationId: string) => any[];
  onAddHotelBooking?: () => void;
  onRemoveHotelBooking?: (index: number) => void;
}

export const TravelDetailsStep: React.FC<TravelDetailsStepProps> = ({
  data,
  onChange,
  airports,
  disabled = false,
  isGroupBooking = false,
  locations = [],
  hotels = [],
  arrivalDate,
  departureDate,
  onLoadHotels,
  getHotelsForLocation,
  onAddHotelBooking,
  onRemoveHotelBooking,
}) => {
  const [durationDays, setDurationDays] = React.useState(0);
  const [durationError, setDurationError] = React.useState('');

  // Hotel bookings from step2Data (for group bookings)
  const hotelBookings = (data as any).hotelBookings || [];

  // Check if hotels are valid/complete (for group bookings)
  const areHotelsValid = React.useMemo(() => {
    if (!isGroupBooking || hotelBookings.length === 0) return false;
    return hotelBookings.every(
      (booking: any) =>
        booking.cityId &&
        booking.hotelId &&
        booking.checkInDate &&
        booking.checkOutDate
    );
  }, [isGroupBooking, hotelBookings]);

  // Hotel coverage calculation (for group bookings)
  const coverage = useHotelCoverage({
    arrivalDate: arrivalDate || data.arrivalDate,
    departureDate: departureDate || data.departureDate,
    hotelBookings: hotelBookings,
  });

  const handleDateChange = (field: 'arrivalDate' | 'departureDate', value: string) => {
    onChange({ [field]: value });

    const arrival = field === 'arrivalDate' ? value : data.arrivalDate;
    const departure = field === 'departureDate' ? value : data.departureDate;

    const result = calculateDuration(arrival, departure);
    setDurationDays(result.days);
    setDurationError(result.error);
  };

  const handleAirportChange = async (field: 'arrivalAirportId' | 'departureAirportId', value: string) => {
    onChange({ [field]: value });
  };

  // Update hotel booking handler (for group bookings)
  const updateHotelBooking = React.useCallback(
    (index: number, field: keyof typeof hotelBookings[0], value: string | string[]) => {
      const updatedBookings = [...hotelBookings];
      updatedBookings[index] = { ...updatedBookings[index], [field]: value };

      if (field === 'cityId' && onLoadHotels) {
        updatedBookings[index].hotelId = '';
        onLoadHotels(value as string);
      }

      if (field === 'checkOutDate' && updatedBookings[index + 1]) {
        updatedBookings[index + 1].checkInDate = value as string;
      }

      onChange({ hotelBookings: updatedBookings } as any);
    },
    [hotelBookings, onChange, onLoadHotels]
  );

  return (
    <div className="space-y-6">
      {/* Passenger Count (Both Individual and Group Bookings) - Before Flight Details */}
      <div className="space-y-2">
        <Label htmlFor="passengerCount">No. of Passengers (Pax) *</Label>
        <Input
          id="passengerCount"
          type="number"
          min="1"
          placeholder="Enter number of passengers"
          value={data.passengerCount || ''}
          onChange={(e) => onChange({ passengerCount: parseInt(e.target.value) || undefined })}
          disabled={disabled}
        />
        <p className="text-xs text-gray-500">
          Enter the total number of passengers for this booking
        </p>
      </div>

      {/* Travel Details Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Travel Details</h4>
            <p className="text-sm text-gray-600">Enter your arrival and departure information</p>
          </div>
          {durationDays > 0 && (
            <div className={`text-sm font-medium ${durationError ? 'text-red-600' : 'text-green-600'}`}>
              {durationError || `✓ Travel duration: ${durationDays} day${durationDays > 1 ? 's' : ''}`}
            </div>
          )}
        </div>

        <TravelDetailsForm
          data={data}
          onChange={onChange}
          airports={airports}
          disabled={disabled}
          durationDays={durationDays}
          durationError={durationError}
          onDateChange={handleDateChange}
          onAirportChange={handleAirportChange}
        />
      </div>

      {/* Hotel Booking Section (Group Bookings Only) */}
      {isGroupBooking && (
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
                {hotelBookings.length > 0 && (
                  <HotelCoverageIndicator
                    coveredDays={coverage.coveredDays}
                    totalDays={coverage.totalDays}
                    coveragePercentage={coverage.coveragePercentage}
                    remainingDays={coverage.remainingDays}
                    totalBookedDays={coverage.totalBookedDays}
                    daysBeyond={coverage.daysBeyond}
                  />
                )}
              </div>
              {onAddHotelBooking && (
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
              )}
            </div>

            {getHotelsForLocation && (
              <HotelBookingTable
                hotelBookings={hotelBookings}
                locations={locations}
                hotels={hotels}
                getHotelsForLocation={getHotelsForLocation}
                onUpdateBooking={updateHotelBooking}
                onRemoveBooking={onRemoveHotelBooking}
                onAddBooking={onAddHotelBooking}
                disabled={disabled}
                showAddButton={true}
                arrivalDate={arrivalDate || data.arrivalDate}
                departureDate={departureDate || data.departureDate}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
