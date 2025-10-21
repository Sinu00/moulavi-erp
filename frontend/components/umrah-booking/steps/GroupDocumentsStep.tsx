import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Step4Data, Step1Data, Step3Data } from '@/lib/umrah/types';
import { BOOKING_RULES } from '@/lib/umrah/constants';
import { Users } from 'lucide-react';

interface GroupDocumentsStepProps {
  data: Step4Data;
  step1Data: Step1Data;
  step3Data: Step3Data;
  skipDocuments: boolean;
  onChange: (data: Partial<Step4Data>) => void;
  onSkipDocumentsChange: (skip: boolean) => void;
  onStep1DataChange: (data: Partial<Step1Data>) => void;
  onAddPassenger: () => void;
  onRemovePassenger: (index: number) => void;
  disabled?: boolean;
}

export const GroupDocumentsStep: React.FC<GroupDocumentsStepProps> = ({
  data,
  step1Data,
  step3Data,
  skipDocuments,
  onChange,
  onSkipDocumentsChange,
  onStep1DataChange,
  onAddPassenger,
  onRemovePassenger,
  disabled = false,
}) => {
  const updatePassenger = (index: number, field: keyof typeof data.passengers[0], value: any) => {
    const updatedPassengers = [...data.passengers];
    updatedPassengers[index] = { ...updatedPassengers[index], [field]: value };
    
    if (field === 'isLeadPassenger' && value) {
      updatedPassengers.forEach((p, i) => {
        p.isLeadPassenger = i === index;
      });
    }
    
    onChange({ passengers: updatedPassengers });
  };

  const getDocumentRequirements = () => {
    // Group bookings with hotel accommodation
    return BOOKING_RULES.group.hotel;
  };

  const requirements = getDocumentRequirements();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Group Passengers & Documents</h4>
          <p className="text-sm text-gray-600">
            Add passengers for your group booking
          </p>
          <div className="flex items-center gap-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            <span>🚧</span>
            <span>Development Mode: Document uploads disabled - Only passenger information required</span>
          </div>
        </div>
      </div>

      {/* Group booking: Single document upload section */}
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h5 className="font-medium">Group Documents</h5>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Group Name *</Label>
              <Input
                placeholder="Enter group name"
                value={step1Data.groupName || ''}
                onChange={(e) => onStep1DataChange({ groupName: e.target.value })}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label>Number of Passengers *</Label>
              <Input
                type="number"
                min="1"
                max="50"
                placeholder="Enter number of passengers in group"
                value={data.passengers.length}
                onChange={(e) => {
                  const count = parseInt(e.target.value) || 1;
                  if (count >= 1 && count <= 50) {
                    onChange({
                      passengers: Array(count).fill(null).map((_, index) => ({
                        fullName: index === 0 ? step1Data.groupName : '',
                        isLeadPassenger: index === 0,
                        panCardPhoto: index === 0 ? data.passengers[0]?.panCardPhoto : null,
                        passportFront: null,
                        passportBack: null,
                        iqamaPhoto: null,
                        hotelBooking: null,
                        ticketCopy: null,
                      }))
                    });
                  }
                }}
                disabled={disabled}
              />
              <p className="text-xs text-gray-500">Enter the total number of passengers in your group (1-50 passengers)</p>
            </div>

            {/* Document Requirements Info - Development Mode */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h6 className="font-medium text-green-900 mb-2">Group Booking Documents (Development Mode):</h6>
              <div className="space-y-1 text-sm text-green-800">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">•</span>
                  <span>PAN Card Photo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">•</span>
                  <span>Passport Front & Back</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">•</span>
                  <span>Hotel Booking Document</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">•</span>
                  <span>Ticket Copy</span>
                </div>
              </div>
              <p className="text-xs text-green-700 mt-2">
                <strong>Development Mode:</strong> Document uploads are disabled. Only passenger information is required.
                Documents will be handled in production.
              </p>
            </div>

            {data.passengers.map((passenger, index) => (
              <Card key={index} className="p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h6 className="font-medium text-gray-900">
                    Passenger {index + 1} {passenger.isLeadPassenger && '(Lead Passenger)'}
                  </h6>
                  <div className="flex items-center space-x-2">
                    {index === 0 && (
                      <div className="flex items-center space-x-2 mr-4">
                        <input
                          type="checkbox"
                          id={`lead-${index}`}
                          checked={passenger.isLeadPassenger}
                          onChange={(e) => updatePassenger(index, 'isLeadPassenger', e.target.checked)}
                          className="rounded"
                          disabled={disabled}
                        />
                        <Label htmlFor={`lead-${index}`} className="text-sm">
                          Lead Passenger
                        </Label>
                      </div>
                    )}
                    {data.passengers.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRemovePassenger(index)}
                        disabled={disabled}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      placeholder="As per passport"
                      value={passenger.fullName}
                      onChange={(e) => updatePassenger(index, 'fullName', e.target.value)}
                      disabled={disabled}
                    />
                  </div>

                  {/* Document uploads disabled for development */}
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    📝 Document uploads will be enabled in production
                  </div>
                </div>
              </Card>
            ))}

            {data.passengers.length < 50 && (
              <Button
                type="button"
                variant="outline"
                onClick={onAddPassenger}
                disabled={disabled}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                Add Another Passenger
              </Button>
            )}
          </div>
        </Card>
      </div>

      <div className="bg-green-50 p-4 rounded-lg">
        <p className="text-sm text-green-800">
          <strong>Development Mode:</strong> Group booking with passenger information only. Document uploads are disabled to match backend development mode.
          <br />
          <strong>Backend Status:</strong> Group bookings skip document validation in development mode.
        </p>
      </div>
    </div>
  );
};
