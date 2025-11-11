// Step 5: Documents Component

import React from 'react';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { Step5Data, Step1Data, Step3Data, Passenger } from '@/lib/umrah/types';
import { BOOKING_LIMITS } from '@/lib/umrah/constants';
import { PassengerCard } from '../components/PassengerCard';

interface DocumentsStepProps {
  data: Step5Data;
  step1Data: Step1Data;
  step3Data: Step3Data;
  onChange: (data: Partial<Step5Data>) => void;
  onStep1DataChange?: (data: Partial<Step1Data>) => void;
  disabled?: boolean;
}

export const DocumentsStep: React.FC<DocumentsStepProps> = ({
  data,
  step1Data,
  step3Data,
  onChange,
  onStep1DataChange,
  disabled = false,
}) => {
  const addPassenger = React.useCallback(() => {
    if (
      step3Data.accommodationType === 'iqama' &&
      data.passengers.length >= BOOKING_LIMITS.MAX_PASSENGERS_IQAMA
    ) {
      return;
    }

    onChange({
      passengers: [
        ...data.passengers,
        {
          fullName: '',
          isLeadPassenger: false,
          panCardPhoto: null,
          passportFront: null,
          passportBack: null,
          iqamaPhoto: null,
          hotelBooking: null,
          ticketCopy: null,
        },
      ],
    });
  }, [data.passengers, step3Data.accommodationType, onChange]);

  const removePassenger = React.useCallback(
    (index: number) => {
      if (data.passengers.length <= 1) return;

      onChange({
        passengers: data.passengers.filter((_, i) => i !== index),
      });
    },
    [data.passengers, onChange]
  );

  const updatePassenger = React.useCallback(
    (index: number, field: keyof Passenger, value: any) => {
      const updatedPassengers = [...data.passengers];
      updatedPassengers[index] = { ...updatedPassengers[index], [field]: value };

      if (field === 'isLeadPassenger' && value) {
        updatedPassengers.forEach((p, i) => {
          p.isLeadPassenger = i === index;
        });
      }

      onChange({ passengers: updatedPassengers });
    },
    [data.passengers, onChange]
  );

  // Determine document requirements based on booking mode and accommodation type
  const hasGroupNumber = step1Data.bookingMode === 'group_number';
  
  const getDocumentRequirements = () => {
    if (hasGroupNumber) {
      if (step3Data.accommodationType === 'hotel') {
        return 'PAN Card + Ticket Copy + Hotel Copy (Lead Passenger Only)';
      } else {
        return 'PAN Card + Iqama Copy (Lead Passenger Only)';
      }
    } else {
      return 'Passport Front & Back (All Passengers) + PAN Card (Lead Passenger Only)';
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Passenger Documents</h4>
        <p className="text-sm text-gray-600">Upload required documents for each passenger</p>
        <div className="flex items-center gap-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
          <span>📋</span>
          <span>{getDocumentRequirements()}</span>
        </div>
      </div>

      {step3Data.accommodationType === 'iqama' &&
        data.passengers.length > BOOKING_LIMITS.MAX_PASSENGERS_IQAMA && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              ⚠️ Maximum {BOOKING_LIMITS.MAX_PASSENGERS_IQAMA} passengers allowed for iqama
              accommodation. Please remove{' '}
              {data.passengers.length - BOOKING_LIMITS.MAX_PASSENGERS_IQAMA} passenger(s).
            </p>
          </div>
        )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={addPassenger}
          disabled={
            step3Data.accommodationType === 'iqama' &&
            data.passengers.length >= BOOKING_LIMITS.MAX_PASSENGERS_IQAMA
          }
        >
          <Users className="h-4 w-4 mr-2" />
          Add Passenger
          {step3Data.accommodationType === 'iqama' &&
            ` (${data.passengers.length}/${BOOKING_LIMITS.MAX_PASSENGERS_IQAMA})`}
        </Button>
      </div>

      <div className="space-y-4">
        {data.passengers.map((passenger, index) => (
          <PassengerCard
            key={index}
            passenger={passenger}
            index={index}
            step1Data={step1Data}
            step3Data={step3Data}
            onUpdate={(field, value) => updatePassenger(index, field, value)}
            onRemove={data.passengers.length > 1 ? () => removePassenger(index) : undefined}
            disabled={disabled}
          />
        ))}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Required Documents:</strong>
          <br />• {getDocumentRequirements()}
          <br />• Supported formats: Images (JPG, PNG) and PDF (MAX. 10MB)
        </p>
      </div>
    </div>
  );
};
