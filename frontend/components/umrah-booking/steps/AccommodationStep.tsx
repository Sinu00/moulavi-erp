// Step 3: Accommodation Component

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Hotel } from 'lucide-react';
import { Step3Data, Location, Hotel as HotelType, HotelBooking } from '@/lib/umrah/types';
import { useHotelCoverage } from '../hooks/useHotelCoverage';
import { HotelBookingTable } from '../components/HotelBookingTable';
import { HotelCoverageIndicator } from '../components/HotelCoverageIndicator';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS_AND_CHARS,
} from "@/components/ui/input-otp";

interface AccommodationStepProps {
  data: Step3Data;
  onChange: (data: Partial<Step3Data>) => void;
  locations: Location[];
  hotels: HotelType[];
  arrivalDate: string;
  departureDate: string;
  onLoadHotels: (locationId: string) => void;
  getHotelsForLocation: (locationId: string) => HotelType[];
  passengerCount?: number; // Add passenger count from step 1
  disabled?: boolean;
}

export const AccommodationStep: React.FC<AccommodationStepProps> = ({
  data,
  onChange,
  locations,
  hotels,
  arrivalDate,
  departureDate,
  onLoadHotels,
  getHotelsForLocation,
  passengerCount,
  disabled = false,
}) => {
  const MAX_PASSENGERS_IQAMA = 5;
  const canSelectIqama = !passengerCount || passengerCount <= MAX_PASSENGERS_IQAMA;
  const addHotelBooking = React.useCallback(() => {
    const existingBookings = data.hotelBookings || [];
    let checkInDate = '';

    if (existingBookings.length === 0) {
      checkInDate = arrivalDate;
    } else {
      const lastBooking = existingBookings[existingBookings.length - 1];
      checkInDate = lastBooking.checkOutDate || '';
    }

    onChange({
      hotelBookings: [
        ...existingBookings,
        {
          cityId: '',
          hotelId: '',
          checkInDate,
          checkOutDate: '',
        },
      ],
    });
  }, [data.hotelBookings, arrivalDate, onChange]);

  const removeHotelBooking = React.useCallback(
    (index: number) => {
      const updatedBookings = data.hotelBookings?.filter((_, i) => i !== index) || [];

      if (updatedBookings[index] && index > 0) {
        const previousHotel = updatedBookings[index - 1];
        if (previousHotel.checkOutDate) {
          updatedBookings[index].checkInDate = previousHotel.checkOutDate;
        }
      } else if (updatedBookings[index] && index === 0) {
        updatedBookings[index].checkInDate = arrivalDate;
      }

      onChange({ hotelBookings: updatedBookings });
    },
    [data.hotelBookings, arrivalDate, onChange]
  );

  const updateHotelBooking = React.useCallback(
    (index: number, field: keyof HotelBooking, value: string | string[]) => {
      const updatedBookings = [...(data.hotelBookings || [])];
      updatedBookings[index] = { ...updatedBookings[index], [field]: value };

      if (field === 'cityId' && typeof value === 'string') {
        updatedBookings[index].hotelId = '';
        onLoadHotels(value);
      }

      if (field === 'checkOutDate' && updatedBookings[index + 1] && typeof value === 'string') {
        updatedBookings[index + 1].checkInDate = value;
      }

      onChange({ hotelBookings: updatedBookings });
    },
    [data.hotelBookings, onChange, onLoadHotels]
  );

  const coverage = useHotelCoverage({
    arrivalDate,
    departureDate,
    hotelBookings: data.hotelBookings,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-base font-medium">Select Accommodation Type *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              data.accommodationType === 'hotel'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => {
              if (!disabled) {
                // Clear iqama data when switching to hotel
                onChange({ 
                  accommodationType: 'hotel',
                  iqamaDetails: undefined,
                  hotelBookings: data.hotelBookings || []
                });
              }
            }}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-4 h-4 rounded-full border-2 ${
                  data.accommodationType === 'hotel'
                    ? 'border-red-500 bg-red-500'
                    : 'border-gray-300'
                }`}
              />
              <div>
                <h3 className="font-medium">Hotel Booking</h3>
                <p className="text-sm text-gray-500">Select hotels by location</p>
              </div>
            </div>
          </div>

          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              data.accommodationType === 'iqama'
                ? 'border-red-500 bg-red-50'
                : canSelectIqama
                ? 'border-gray-200 hover:border-gray-300'
                : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
            }`}
            onClick={() => {
              if (!disabled && canSelectIqama) {
                // Clear hotel data when switching to iqama
                onChange({ 
                  accommodationType: 'iqama',
                  hotelBookings: undefined,
                  iqamaDetails: data.iqamaDetails || {}
                });
              }
            }}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-4 h-4 rounded-full border-2 ${
                  data.accommodationType === 'iqama'
                    ? 'border-red-500 bg-red-500'
                    : 'border-gray-300'
                }`}
              />
              <div>
                <h3 className="font-medium">Iqama Sponsor</h3>
                <p className="text-sm text-gray-500">
                  {canSelectIqama ? 'Stay with sponsor' : `Maximum ${MAX_PASSENGERS_IQAMA} passengers allowed`}
                </p>
              </div>
            </div>
            {!canSelectIqama && passengerCount && (
              <div className="mt-2 text-xs text-red-600">
                ⚠️ Cannot select iqama: {passengerCount} passengers exceeds limit of {MAX_PASSENGERS_IQAMA}
              </div>
            )}
          </div>
        </div>
      </div>

      {data.accommodationType === 'hotel' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Hotel Bookings</h4>
              <p className="text-sm text-gray-600">Add hotels for your accommodation</p>
              {data.hotelBookings && data.hotelBookings.length > 0 && (
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
            <Button type="button" variant="outline" size="sm" onClick={addHotelBooking}>
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
            onRemoveBooking={removeHotelBooking}
            onAddBooking={addHotelBooking}
            disabled={disabled}
            showAddButton={true}
            arrivalDate={arrivalDate}
            departureDate={departureDate}
          />
        </div>
      )}

      {data.accommodationType === 'iqama' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="iqamaNumber">Iqama Number *</Label>
            <Input
              id="iqamaNumber"
              placeholder="Enter iqama number"
              value={data.iqamaDetails?.iqamaNumber || ''}
              onChange={(e) =>
                onChange({
                  iqamaDetails: { ...data.iqamaDetails, iqamaNumber: e.target.value },
                })
              }
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iqamaName">Iqama Name *</Label>
            <Input
              id="iqamaName"
              placeholder="Enter iqama holder name"
              value={data.iqamaDetails?.iqamaName || ''}
              onChange={(e) =>
                onChange({
                  iqamaDetails: { ...data.iqamaDetails, iqamaName: e.target.value },
                })
              }
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iqamaDob">Date of Birth</Label>
            <Input
              id="iqamaDob"
              type="date"
              value={data.iqamaDetails?.iqamaDob || ''}
              onChange={(e) =>
                onChange({
                  iqamaDetails: { ...data.iqamaDetails, iqamaDob: e.target.value },
                })
              }
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iqamaMobile">Mobile Number</Label>
            <Input
              id="iqamaMobile"
              type="tel"
              placeholder="+966 123456789"
              value={data.iqamaDetails?.iqamaMobile || ''}
              onChange={(e) =>
                onChange({
                  iqamaDetails: { ...data.iqamaDetails, iqamaMobile: e.target.value },
                })
              }
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iqamaNationalShortAddress">National Short Address *</Label>
            <InputOTP
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
              value={data.iqamaDetails?.iqamaNationalShortAddress || ''}
              onChange={(value) =>
                onChange({
                  iqamaDetails: { ...data.iqamaDetails, iqamaNationalShortAddress: value },
                })
              }
              disabled={disabled}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <p className="text-xs text-gray-500">Enter 6-character national short address</p>
          </div>
        </div>
      )}
    </div>
  );
};

