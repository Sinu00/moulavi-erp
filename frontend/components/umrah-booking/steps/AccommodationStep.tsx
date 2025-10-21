// Step 3: Accommodation Component

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hotel } from 'lucide-react';
import { Step3Data, Location, Hotel as HotelType } from '@/lib/umrah/types';
import { calculateHotelCoverage } from '@/lib/umrah/validation';

interface AccommodationStepProps {
  data: Step3Data;
  onChange: (data: Partial<Step3Data>) => void;
  locations: Location[];
  hotels: HotelType[];
  arrivalDate: string;
  departureDate: string;
  onLoadHotels: (locationId: string) => void;
  getHotelsForLocation: (locationId: string) => HotelType[];
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
  disabled = false,
}) => {
  const addHotelBooking = () => {
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
          locationId: '',
          hotelId: '',
          checkInDate,
          checkOutDate: '',
        },
      ],
    });
  };

  const removeHotelBooking = (index: number) => {
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
  };

  const updateHotelBooking = (index: number, field: string, value: string) => {
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
  };

  const coverage = calculateHotelCoverage(arrivalDate, departureDate, data.hotelBookings || []);
  const totalDays = coverage.totalCovered + coverage.remainingDays;
  const coveragePercentage = totalDays > 0 ? Math.round((coverage.totalCovered / totalDays) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-base font-medium">Select Accommodation Type *</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              data.accommodationType === 'hotel' 
                ? 'border-red-500 bg-red-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => !disabled && onChange({ accommodationType: 'hotel' })}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full border-2 ${
                data.accommodationType === 'hotel' ? 'border-red-500 bg-red-500' : 'border-gray-300'
              }`} />
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
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => !disabled && onChange({ accommodationType: 'iqama' })}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full border-2 ${
                data.accommodationType === 'iqama' ? 'border-red-500 bg-red-500' : 'border-gray-300'
              }`} />
              <div>
                <h3 className="font-medium">Iqama Sponsor</h3>
                <p className="text-sm text-gray-500">Stay with sponsor</p>
              </div>
            </div>
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
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-600">Coverage:</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          coveragePercentage === 100 ? 'bg-green-500' : 
                          coveragePercentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${coveragePercentage}%` }}
                      />
                    </div>
                    <span className={`font-medium ${
                      coveragePercentage === 100 ? 'text-green-600' : 
                      coveragePercentage >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {coverage.totalCovered}/{totalDays} days ({coveragePercentage}%)
                    </span>
                    {coverage.remainingDays > 0 && (
                      <span className="text-red-600 font-medium">
                        ⚠️ {coverage.remainingDays} day{coverage.remainingDays > 1 ? 's' : ''} uncovered
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addHotelBooking}>
              <Hotel className="h-4 w-4 mr-2" />
              Add Hotel
            </Button>
          </div>
          
          {data.hotelBookings && data.hotelBookings.length > 0 ? (
            <div className="space-y-4">
              {data.hotelBookings.map((booking, index) => {
                const location = locations.find(l => l.id === booking.locationId);
                const hotel = hotels.find(h => h.id === booking.hotelId);
                const checkIn = booking.checkInDate ? new Date(booking.checkInDate) : null;
                const checkOut = booking.checkOutDate ? new Date(booking.checkOutDate) : null;
                const duration = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                
                return (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-medium">Hotel {index + 1}</h5>
                      {data.hotelBookings!.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeHotelBooking(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label>Location *</Label>
                          <Select 
                            value={booking.locationId} 
                            onValueChange={(value) => updateHotelBooking(index, 'locationId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                  {location.destinationName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Hotel *</Label>
                          <Select 
                            value={booking.hotelId} 
                            onValueChange={(value) => updateHotelBooking(index, 'hotelId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select hotel" />
                            </SelectTrigger>
                            <SelectContent>
                              {getHotelsForLocation(booking.locationId).map((hotel) => (
                                <SelectItem key={hotel.id} value={hotel.id}>
                                  {hotel.hotelName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Check-in Date *</Label>
                          <Input
                            type="date"
                            value={booking.checkInDate}
                            onChange={(e) => updateHotelBooking(index, 'checkInDate', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Check-out Date *</Label>
                          <Input
                            type="date"
                            value={booking.checkOutDate}
                            onChange={(e) => updateHotelBooking(index, 'checkOutDate', e.target.value)}
                          />
                        </div>
                      </div>

                      {duration > 0 && (
                        <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                          Duration: {duration} night{duration > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <Hotel className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hotel bookings added</h3>
              <p className="text-gray-500 mb-4">Add your first hotel booking to get started</p>
              <Button type="button" variant="outline" onClick={addHotelBooking}>
                <Hotel className="h-4 w-4 mr-2" />
                Add First Hotel
              </Button>
            </div>
          )}
        </div>
      )}

      {data.accommodationType === 'iqama' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="iqamaNumber">Iqama Number *</Label>
            <Input
              id="iqamaNumber"
              placeholder="Enter iqama number"
              value={data.iqamaDetails?.iqamaNumber || ''}
              onChange={(e) => onChange({
                iqamaDetails: { ...data.iqamaDetails, iqamaNumber: e.target.value }
              })}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iqamaName">Iqama Name *</Label>
            <Input
              id="iqamaName"
              placeholder="Enter iqama holder name"
              value={data.iqamaDetails?.iqamaName || ''}
              onChange={(e) => onChange({
                iqamaDetails: { ...data.iqamaDetails, iqamaName: e.target.value }
              })}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iqamaDob">Date of Birth</Label>
            <Input
              id="iqamaDob"
              type="date"
              value={data.iqamaDetails?.iqamaDob || ''}
              onChange={(e) => onChange({
                iqamaDetails: { ...data.iqamaDetails, iqamaDob: e.target.value }
              })}
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
              onChange={(e) => onChange({
                iqamaDetails: { ...data.iqamaDetails, iqamaMobile: e.target.value }
              })}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
};
