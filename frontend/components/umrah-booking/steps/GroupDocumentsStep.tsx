import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Step4Data, Step1Data, Step3Data } from '@/lib/umrah/types';
import { FileUpload } from 'lucide-react';

interface GroupDocumentsStepProps {
  data: Step4Data;
  step1Data: Step1Data;
  step3Data: Step3Data;
  onChange: (data: Partial<Step4Data>) => void;
  onStep1DataChange: (data: Partial<Step1Data>) => void;
  onAddPassenger: () => void;
  onRemovePassenger: (index: number) => void;
  disabled?: boolean;
}

export const GroupDocumentsStep: React.FC<GroupDocumentsStepProps> = ({
  data,
  step1Data,
  step3Data,
  onChange,
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

  const handleFileUpload = (index: number, field: 'panCardPhoto', file: File | null) => {
    updatePassenger(index, field, file);
  };

  // Ensure we have at least one passenger (lead passenger) for PAN card upload
  const leadPassenger = data.passengers.find(p => p.isLeadPassenger) || data.passengers[0];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Group Passengers & Documents</h4>
        <p className="text-sm text-gray-600">
          Add passengers for your group booking and upload the required PAN card
        </p>
      </div>

      <div className="space-y-4">
        <Card className="p-6">
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
                        panCardPhoto: index === 0 ? (leadPassenger?.panCardPhoto || null) : null,
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

            {/* Document Requirements Info */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h6 className="font-medium text-blue-900 mb-2">Required Documents:</h6>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">•</span>
                  <span>PAN Card (lead passenger only)</span>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Only one PAN card is required for the entire group. Upload it for the lead passenger.
              </p>
            </div>

            {/* Passenger List */}
            <div className="space-y-3">
              {data.passengers.map((passenger, index) => (
                <Card key={index} className="p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h6 className="font-medium text-gray-900">
                      Passenger {index + 1} {passenger.isLeadPassenger && <span className="text-red-600">(Lead Passenger)</span>}
                    </h6>
                    {data.passengers.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRemovePassenger(index)}
                        disabled={disabled || index === 0}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    )}
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

                    {/* PAN Card Upload - Only for Lead Passenger */}
                    {passenger.isLeadPassenger && (
                      <div className="space-y-2">
                        <Label>PAN Card *</Label>
                        <div className="flex items-center gap-4">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <FileUpload className="w-8 h-8 mb-2 text-gray-500" />
                              <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-gray-500">PNG, JPG, PDF (MAX. 10MB)</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                handleFileUpload(index, 'panCardPhoto', file);
                              }}
                              disabled={disabled}
                            />
                          </label>
                        </div>
                        {passenger.panCardPhoto && (
                          <p className="text-sm text-green-600">
                            ✓ {passenger.panCardPhoto.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {data.passengers.length < 50 && (
              <Button
                type="button"
                variant="outline"
                onClick={onAddPassenger}
                disabled={disabled}
                className="w-full"
              >
                Add Another Passenger
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
