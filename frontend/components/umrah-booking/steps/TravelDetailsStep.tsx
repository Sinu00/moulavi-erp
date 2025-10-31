// Step 2: Travel Details Component

import React from 'react';
import { Step2Data, Airport } from '@/lib/umrah/types';
import { calculateDuration } from '@/lib/umrah/validation';
import { TravelDetailsForm } from '../components/TravelDetailsForm';

interface TravelDetailsStepProps {
  data: Step2Data;
  onChange: (data: Partial<Step2Data>) => void;
  airports: Airport[];
  disabled?: boolean;
}

export const TravelDetailsStep: React.FC<TravelDetailsStepProps> = ({
  data,
  onChange,
  airports,
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

      {/* Transport options removed from Step 2 in group flow; handled after hotels */}
    </div>
  );
};
