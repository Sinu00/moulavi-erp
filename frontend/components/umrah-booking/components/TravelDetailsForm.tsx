import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { Step2Data, Airport } from '@/lib/umrah/types';
import { formatFlightNumber } from '@/lib/umrah/validation';

interface TravelDetailsFormProps {
  data: Step2Data;
  onChange: (data: Partial<Step2Data>) => void;
  airports: Airport[];
  disabled?: boolean;
  durationDays?: number;
  durationError?: string;
  onDateChange?: (field: 'arrivalDate' | 'departureDate', value: string) => void;
  onAirportChange?: (field: 'arrivalAirportId' | 'departureAirportId', value: string) => void;
}

export const TravelDetailsForm: React.FC<TravelDetailsFormProps> = ({
  data,
  onChange,
  airports,
  disabled = false,
  durationDays = 0,
  durationError = '',
  onDateChange,
  onAirportChange,
}) => {
  const handleDateChange = (field: 'arrivalDate' | 'departureDate', value: string) => {
    if (onDateChange) {
      onDateChange(field, value);
    } else {
      onChange({ [field]: value });
    }
  };

  const handleAirportChange = (field: 'arrivalAirportId' | 'departureAirportId', value: string) => {
    if (onAirportChange) {
      onAirportChange(field, value);
    } else {
      onChange({ [field]: value });
    }
  };

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                  Type
                </th>
                <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                  Airport
                </th>
                <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                  Flight Number
                </th>
                <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                  Date
                </th>
                <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                  Time
                </th>
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
                    disabled={disabled}
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
                    value={data.arrivalTime || ''}
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
                    onValueChange={(value) => handleAirportChange('departureAirportId', value)}
                    disabled={disabled}
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
                    value={data.departureTime || ''}
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
                <Label>Time * (24-hour format)</Label>
                <Input
                  type="time"
                  value={data.arrivalTime || ''}
                  onChange={(e) => onChange({ arrivalTime: e.target.value })}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <Label>Airport *</Label>
                <Select
                  value={data.arrivalAirportId}
                  onValueChange={(value) => handleAirportChange('arrivalAirportId', value)}
                  disabled={disabled}
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
                <p className="text-xs text-gray-500">
                  Format: XX-1234 (2 letters, dash, 1-4 numbers)
                </p>
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
                <Label>Time * (24-hour format)</Label>
                <Input
                  type="time"
                  value={data.departureTime || ''}
                  onChange={(e) => onChange({ departureTime: e.target.value })}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <Label>Airport *</Label>
                <Select
                  value={data.departureAirportId}
                  onValueChange={(value) => handleAirportChange('departureAirportId', value)}
                  disabled={disabled}
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
                <div
                  className={`text-lg font-bold ${durationError ? 'text-red-600' : 'text-blue-600'}`}
                >
                  {durationError || `${durationDays} day${durationDays > 1 ? 's' : ''}`}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

