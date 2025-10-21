import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Step3Data, Step2Data } from '@/lib/umrah/types';
import { Hotel, Building } from 'lucide-react';

interface GroupAccommodationStepProps {
  data: Step3Data;
  onChange: (data: Partial<Step3Data>) => void;
  locations: any[];
  hotels: any[];
  arrivalDate: string;
  departureDate: string;
  onLoadHotels: (locationId: string) => void;
  getHotelsForLocation: (locationId: string) => any[];
  onAddHotelBooking: () => void;
  onRemoveHotelBooking: (index: number) => void;
  disabled?: boolean;
}

export const GroupAccommodationStep: React.FC<GroupAccommodationStepProps> = ({
  data,
  onChange,
  locations,
  hotels,
  arrivalDate,
  departureDate,
  onLoadHotels,
  getHotelsForLocation,
  onAddHotelBooking,
  onRemoveHotelBooking,
  disabled = false,
}) => {
  const calculateHotelCoverage = () => {
    if (!arrivalDate || !departureDate || !data.hotelBookings) {
      return { totalCovered: 0, uncoveredDates: [], remainingDays: 0 };
    }

    const arrivalDateObj = new Date(arrivalDate);
    const departureDateObj = new Date(departureDate);
    const allDates: string[] = [];
    
    // Generate all dates in the travel period
    const currentDate = new Date(arrivalDateObj);
    while (currentDate < departureDateObj) {
      allDates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get covered dates from hotel bookings
    const coveredDates = new Set<string>();
    data.hotelBookings.forEach(booking => {
      if (booking.checkInDate && booking.checkOutDate) {
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        const current = new Date(checkIn);
        
        while (current < checkOut) {
          coveredDates.add(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      }
    });

    // Find uncovered dates
    const uncoveredDates = allDates.filter(date => !coveredDates.has(date));
    
    return {
      totalCovered: coveredDates.size,
      uncoveredDates,
      remainingDays: uncoveredDates.length
    };
  };

  const updateHotelBooking = (index: number, field: string, value: any) => {
    const updatedBookings = [...(data.hotelBookings || [])];
    updatedBookings[index] = { ...updatedBookings[index], [field]: value };
    
    if (field === 'locationId') {
      updatedBookings[index].hotelId = ''; // Reset hotel selection
      onLoadHotels(value);
    }
    
    if (field === 'checkOutDate' && updatedBookings[index + 1]) {
      // Update check-in date of the next hotel
      updatedBookings[index + 1].checkInDate = value;
    }
    
    onChange({ hotelBookings: updatedBookings });
  };

  const coverage = calculateHotelCoverage();
  const totalDays = arrivalDate && departureDate ? 
    Math.ceil((new Date(departureDate).getTime() - new Date(arrivalDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const coveredDays = totalDays - coverage.remainingDays;
  const coveragePercentage = totalDays > 0 ? Math.round((coveredDays / totalDays) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <Hotel className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Hotel Accommodation</h3>
          </div>
          <p className="text-sm text-blue-800">Group bookings require hotel accommodation. Please add your hotel bookings below.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Hotel Bookings</h4>
            <p className="text-sm text-gray-600">Add hotels for your accommodation</p>
            <p className="text-xs text-blue-600 mt-1">
              💡 Check-in dates are auto-filled: First hotel uses arrival date, subsequent hotels use previous hotel's check-out date
            </p>
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
                    {coveredDays}/{totalDays} days ({coveragePercentage}%)
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
          <Button type="button" variant="outline" size="sm" onClick={onAddHotelBooking} disabled={disabled}>
            <Hotel className="h-4 w-4 mr-2" />
            Add Hotel
          </Button>
        </div>
        
        {data.hotelBookings && data.hotelBookings.length > 0 ? (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">#</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Location</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Hotel</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Check-in</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Check-out</th>
                      <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Duration</th>
                      <th className="border border-gray-200 p-3 text-center text-sm font-medium text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.hotelBookings.map((booking, index) => {
                      const location = locations.find(l => l.id === booking.locationId);
                      const hotel = hotels.find(h => h.id === booking.hotelId);
                      const checkIn = booking.checkInDate ? new Date(booking.checkInDate) : null;
                      const checkOut = booking.checkOutDate ? new Date(booking.checkOutDate) : null;
                      const duration = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-200 p-3 font-medium text-gray-900">
                            {index + 1}
                          </td>
                          <td className="border border-gray-200 p-3">
                            <Select 
                              value={booking.locationId} 
                              onValueChange={(value) => updateHotelBooking(index, 'locationId', value)}
                            >
                              <SelectTrigger className="w-full">
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
                          </td>
                          <td className="border border-gray-200 p-3">
                            <Select 
                              value={booking.hotelId} 
                              onValueChange={(value) => updateHotelBooking(index, 'hotelId', value)}
                            >
                              <SelectTrigger className="w-full">
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
                          </td>
                          <td className="border border-gray-200 p-3">
                            <Input
                              type="date"
                              value={booking.checkInDate}
                              onChange={(e) => updateHotelBooking(index, 'checkInDate', e.target.value)}
                              className="w-full"
                              disabled={disabled}
                            />
                          </td>
                          <td className="border border-gray-200 p-3">
                            <Input
                              type="date"
                              value={booking.checkOutDate}
                              onChange={(e) => updateHotelBooking(index, 'checkOutDate', e.target.value)}
                              className="w-full"
                              disabled={disabled}
                            />
                          </td>
                          <td className="border border-gray-200 p-3">
                            <div className="text-sm text-gray-600">
                              {duration > 0 ? `${duration} night${duration > 1 ? 's' : ''}` : '-'}
                            </div>
                          </td>
                          <td className="border border-gray-200 p-3 text-center">
                            {data.hotelBookings!.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onRemoveHotelBooking(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={disabled}
                              >
                                Remove
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden">
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
                          onClick={() => onRemoveHotelBooking(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={disabled}
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
                          <div className="flex items-center gap-2">
                            <Label>Check-in Date *</Label>
                            {(index === 0 && booking.checkInDate === arrivalDate) || 
                             (index > 0 && booking.checkInDate === data.hotelBookings?.[index - 1]?.checkOutDate) ? (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                Auto-filled
                              </span>
                            ) : null}
                          </div>
                          <Input
                            type="date"
                            value={booking.checkInDate}
                            onChange={(e) => updateHotelBooking(index, 'checkInDate', e.target.value)}
                            className={(index === 0 && booking.checkInDate === arrivalDate) || 
                                       (index > 0 && booking.checkInDate === data.hotelBookings?.[index - 1]?.checkOutDate) ? 
                                       'border-blue-300 bg-blue-50' : ''}
                            disabled={disabled}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Check-out Date *</Label>
                          <Input
                            type="date"
                            value={booking.checkOutDate}
                            onChange={(e) => updateHotelBooking(index, 'checkOutDate', e.target.value)}
                            disabled={disabled}
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
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <Hotel className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hotel bookings added</h3>
            <p className="text-gray-500 mb-4">Add your first hotel booking to get started</p>
            <Button type="button" variant="outline" onClick={onAddHotelBooking} disabled={disabled}>
              <Hotel className="h-4 w-4 mr-2" />
              Add First Hotel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
