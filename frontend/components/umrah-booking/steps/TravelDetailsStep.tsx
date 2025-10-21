// Step 2: Travel Details Component

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plane } from 'lucide-react';
import { Step2Data, Airport, TransportOption } from '@/lib/umrah/types';
import { formatFlightNumber, calculateDuration } from '@/lib/umrah/validation';
import { ValidationMessage } from '../shared';

interface TravelDetailsStepProps {
  data: Step2Data;
  onChange: (data: Partial<Step2Data>) => void;
  airports: Airport[];
  transportOptions: TransportOption[];
  onLoadTransportOptions: (airportId: string) => Promise<boolean>;
  disabled?: boolean;
}

export const TravelDetailsStep: React.FC<TravelDetailsStepProps> = ({
  data,
  onChange,
  airports,
  transportOptions,
  onLoadTransportOptions,
  disabled = false,
}) => {
  const [durationDays, setDurationDays] = React.useState(0);
  const [durationError, setDurationError] = React.useState('');

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
    
    if (field === 'arrivalAirportId') {
      await onLoadTransportOptions(value);
    }
  };

  const handleTransportSelection = (option: TransportOption) => {
    const isSelected = data.transportBookings?.some(
      booking => booking.toLocationId === option.toLocationId && 
                booking.vehicleType === option.vehicleType
    );

    if (isSelected) {
      onChange({
        transportBookings: data.transportBookings?.filter(
          booking => !(booking.toLocationId === option.toLocationId && 
                       booking.vehicleType === option.vehicleType)
        ) || []
      });
    } else {
      const newTransportBooking = {
        fromLocationId: option.fromLocationId,
        toLocationId: option.toLocationId,
        vehicleType: option.vehicleType,
        paxCount: option.paxCount,
        price: Number(option.price),
        travelDate: data.arrivalDate,
      };
      
      onChange({
        transportBookings: [...(data.transportBookings || []), newTransportBooking]
      });
    }
  };

  const removeTransportBooking = (index: number) => {
    onChange({
      transportBookings: data.transportBookings?.filter((_, i) => i !== index) || []
    });
  };

  return (
    <div className="space-y-6">
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

        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Type</th>
                  <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Airport</th>
                  <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Flight Number</th>
                  <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">Time</th>
                </tr>
              </thead>
              <tbody>
                {/* Arrival Row */}
                <tr className="hover:bg-gray-50">
                  <td className="border border-gray-200 p-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-medium text-green-700">Arrival</span>
                    </div>
                  </td>
                  <td className="border border-gray-200 p-3">
                    <Select 
                      value={data.arrivalAirportId} 
                      onValueChange={(value) => handleAirportChange('arrivalAirportId', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select arrival airport" />
                      </SelectTrigger>
                      <SelectContent>
                        {airports.map((airport) => (
                          <SelectItem key={airport.id} value={airport.id}>
                            {airport.airportCode} - {airport.airportName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="border border-gray-200 p-3">
                    <Input
                      placeholder="e.g., SV-1234"
                      value={data.arrivalFlightNumber}
                      onChange={(e) => {
                        const formatted = formatFlightNumber(e.target.value);
                        onChange({ arrivalFlightNumber: formatted });
                      }}
                      disabled={disabled}
                      maxLength={7}
                      className="w-full"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <Input
                      type="date"
                      value={data.arrivalDate}
                      onChange={(e) => handleDateChange('arrivalDate', e.target.value)}
                      disabled={disabled}
                      className="w-full"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <Input
                      type="time"
                      value={data.arrivalTime}
                      onChange={(e) => onChange({ arrivalTime: e.target.value })}
                      disabled={disabled}
                      className="w-full"
                    />
                  </td>
                </tr>

                {/* Departure Row */}
                <tr className="hover:bg-gray-50">
                  <td className="border border-gray-200 p-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="font-medium text-red-700">Departure</span>
                    </div>
                  </td>
                  <td className="border border-gray-200 p-3">
                    <Select 
                      value={data.departureAirportId} 
                      onValueChange={(value) => onChange({ departureAirportId: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select departure airport" />
                      </SelectTrigger>
                      <SelectContent>
                        {airports.map((airport) => (
                          <SelectItem key={airport.id} value={airport.id}>
                            {airport.airportCode} - {airport.airportName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="border border-gray-200 p-3">
                    <Input
                      placeholder="e.g., SV-1234"
                      value={data.departureFlightNumber}
                      onChange={(e) => {
                        const formatted = formatFlightNumber(e.target.value);
                        onChange({ departureFlightNumber: formatted });
                      }}
                      disabled={disabled}
                      maxLength={7}
                      className="w-full"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <Input
                      type="date"
                      value={data.departureDate}
                      onChange={(e) => handleDateChange('departureDate', e.target.value)}
                      disabled={disabled}
                      className="w-full"
                    />
                  </td>
                  <td className="border border-gray-200 p-3">
                    <Input
                      type="time"
                      value={data.departureTime}
                      onChange={(e) => onChange({ departureTime: e.target.value })}
                      disabled={disabled}
                      className="w-full"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden">
          <div className="space-y-4">
            {/* Arrival Card */}
            <Card className="p-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <h5 className="font-medium text-green-700">Arrival Details</h5>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={data.arrivalDate}
                    onChange={(e) => handleDateChange('arrivalDate', e.target.value)}
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Time *</Label>
                  <Input
                    type="time"
                    value={data.arrivalTime}
                    onChange={(e) => onChange({ arrivalTime: e.target.value })}
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Airport *</Label>
                  <Select 
                    value={data.arrivalAirportId} 
                    onValueChange={(value) => handleAirportChange('arrivalAirportId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select arrival airport" />
                    </SelectTrigger>
                    <SelectContent>
                      {airports.map((airport) => (
                        <SelectItem key={airport.id} value={airport.id}>
                          {airport.airportCode} - {airport.airportName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Flight Number *</Label>
                  <Input
                    placeholder="e.g., SV-1234"
                    value={data.arrivalFlightNumber}
                    onChange={(e) => {
                      const formatted = formatFlightNumber(e.target.value);
                      onChange({ arrivalFlightNumber: formatted });
                    }}
                    disabled={disabled}
                    maxLength={7}
                  />
                  <p className="text-xs text-gray-500">Format: XX-1234 (2 letters, dash, 1-4 numbers)</p>
                </div>
              </div>
            </Card>

            {/* Departure Card */}
            <Card className="p-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <h5 className="font-medium text-red-700">Departure Details</h5>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={data.departureDate}
                    onChange={(e) => handleDateChange('departureDate', e.target.value)}
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Time *</Label>
                  <Input
                    type="time"
                    value={data.departureTime}
                    onChange={(e) => onChange({ departureTime: e.target.value })}
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Airport *</Label>
                  <Select 
                    value={data.departureAirportId} 
                    onValueChange={(value) => onChange({ departureAirportId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select departure airport" />
                    </SelectTrigger>
                    <SelectContent>
                      {airports.map((airport) => (
                        <SelectItem key={airport.id} value={airport.id}>
                          {airport.airportCode} - {airport.airportName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Flight Number *</Label>
                  <Input
                    placeholder="e.g., SV-1234"
                    value={data.departureFlightNumber}
                    onChange={(e) => {
                      const formatted = formatFlightNumber(e.target.value);
                      onChange({ departureFlightNumber: formatted });
                    }}
                    disabled={disabled}
                    maxLength={7}
                  />
                </div>
              </div>
            </Card>

            {/* Duration Summary */}
            {durationDays > 0 && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Travel Duration</span>
                  </div>
                  <div className={`text-lg font-bold ${durationError ? 'text-red-600' : 'text-blue-600'}`}>
                    {durationError || `${durationDays} day${durationDays > 1 ? 's' : ''}`}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Transport Options */}
      {transportOptions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Transport Options</h4>
              <p className="text-sm text-gray-600">
                Transport selection is required for Jeddah/Medina airports
              </p>
            </div>
            <div className="text-sm text-gray-500">
              From: {transportOptions[0]?.fromLocation?.destinationName}
            </div>
          </div>
          
          {/* Transport Matrix */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                    Destination
                  </th>
                  {Array.from(new Set(transportOptions.map(opt => opt.vehicleType))).map(vehicleType => {
                    const sampleOption = transportOptions.find(opt => opt.vehicleType === vehicleType);
                    return (
                      <th key={vehicleType} className="border border-gray-200 p-3 text-center text-sm font-medium text-gray-700">
                        <div>{vehicleType}</div>
                        <div className="text-xs text-gray-500">({sampleOption?.paxCount} pax)</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Array.from(new Set(transportOptions.map(opt => opt.toLocation.destinationName))).map(destination => {
                  const destinationOptions = transportOptions.filter(opt => opt.toLocation.destinationName === destination);
                  const vehicleTypes = Array.from(new Set(transportOptions.map(opt => opt.vehicleType)));
                  
                  return (
                    <tr key={destination} className="hover:bg-gray-50">
                      <td className="border border-gray-200 p-3 font-medium text-gray-900">
                        {destination}
                      </td>
                      {vehicleTypes.map(vehicleType => {
                        const option = destinationOptions.find(opt => opt.vehicleType === vehicleType);
                        const isSelected = data.transportBookings?.some(
                          booking => booking.toLocationId === option?.toLocationId && 
                                    booking.vehicleType === vehicleType
                        );
                        
                        return (
                          <td 
                            key={vehicleType} 
                            className={`border border-gray-200 p-3 text-center cursor-pointer transition-all duration-200 ${
                              option 
                                ? isSelected 
                                  ? 'bg-green-100 border-green-300 hover:bg-green-200' 
                                  : 'hover:bg-blue-50 hover:border-blue-300'
                                : 'bg-gray-50'
                            }`}
                            onClick={() => option && handleTransportSelection(option)}
                          >
                            {option ? (
                              <div className="space-y-1">
                                <div className={`font-medium ${isSelected ? 'text-green-700' : 'text-green-600'}`}>
                                  {Number(option.price).toFixed(2)} SAR
                                </div>
                                <div className={`text-xs ${isSelected ? 'text-green-600' : 'text-gray-500'}`}>
                                  {isSelected ? '✓ Selected' : 'Click to select'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Show selected transport bookings */}
          {data.transportBookings && data.transportBookings.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-medium text-gray-900">Selected Transport:</h5>
              {data.transportBookings.map((booking, index) => (
                <div key={index} className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{booking.vehicleType}</p>
                      <p className="text-sm text-gray-600">
                        {booking.paxCount} passengers • {Number(booking.price).toFixed(2)} SAR
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTransportBooking(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
