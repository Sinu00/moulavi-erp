// Step 4: Documents Component

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { Step4Data, Step1Data, Step3Data, Passenger } from '@/lib/umrah/types';
import { BOOKING_RULES, BOOKING_LIMITS } from '@/lib/umrah/constants';
import { DocumentUpload } from '../shared';

interface DocumentsStepProps {
  data: Step4Data;
  step1Data: Step1Data;
  step3Data: Step3Data;
  skipDocuments: boolean;
  onChange: (data: Partial<Step4Data>) => void;
  onSkipDocumentsChange: (skip: boolean) => void;
  disabled?: boolean;
}

export const DocumentsStep: React.FC<DocumentsStepProps> = ({
  data,
  step1Data,
  step3Data,
  skipDocuments,
  onChange,
  onSkipDocumentsChange,
  disabled = false,
}) => {
  const addPassenger = () => {
    if (step3Data.accommodationType === 'iqama' && data.passengers.length >= BOOKING_LIMITS.MAX_PASSENGERS_IQAMA) {
      return;
    }
    
    onChange({
      passengers: [...data.passengers, { 
        fullName: '', 
        isLeadPassenger: false, 
        panCardPhoto: null, 
        passportFront: null, 
        passportBack: null, 
        iqamaPhoto: null, 
        hotelBooking: null, 
        ticketCopy: null 
      }]
    });
  };

  const removePassenger = (index: number) => {
    if (data.passengers.length <= 1) return;
    
    onChange({
      passengers: data.passengers.filter((_, i) => i !== index)
    });
  };

  const updatePassenger = (index: number, field: keyof Passenger, value: any) => {
    const updatedPassengers = [...data.passengers];
    updatedPassengers[index] = { ...updatedPassengers[index], [field]: value };
    
    if (field === 'isLeadPassenger' && value) {
      updatedPassengers.forEach((p, i) => {
        p.isLeadPassenger = i === index;
      });
    }
    
    onChange({ passengers: updatedPassengers });
  };

  const updateStep1Data = (field: keyof Step1Data, value: any) => {
    // This would need to be passed from parent component
    // For now, we'll handle it locally in the parent
  };

  const isGroupBooking = step1Data.bookingMode === 'group_number';

  const getDocumentRequirements = () => {
    if (isGroupBooking) {
      return step3Data.accommodationType === 'iqama' 
        ? BOOKING_RULES.group.iqama 
        : BOOKING_RULES.group.hotel;
    } else {
      return BOOKING_RULES.regular;
    }
  };

  const requirements = getDocumentRequirements();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Passenger Documents</h4>
          <p className="text-sm text-gray-600">
            Upload required documents for each passenger
          </p>
          <div className="flex items-center gap-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            <span>📋</span>
            <span>{requirements.description || 'Document requirements'}</span>
          </div>
        </div>
        
        {/* Only show skip documents for development/testing */}
        <div className="flex items-center space-x-2 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
          <input
            type="checkbox"
            id="skipDocuments"
            checked={skipDocuments}
            onChange={(e) => onSkipDocumentsChange(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="skipDocuments" className="text-sm text-yellow-800 cursor-pointer">
            Skip Documents (Development Mode)
          </Label>
        </div>
      </div>

      {!isGroupBooking && step3Data.accommodationType === 'iqama' && data.passengers.length > BOOKING_LIMITS.MAX_PASSENGERS_IQAMA && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            ⚠️ Maximum {BOOKING_LIMITS.MAX_PASSENGERS_IQAMA} passengers allowed for iqama accommodation. 
            Please remove {data.passengers.length - BOOKING_LIMITS.MAX_PASSENGERS_IQAMA} passenger(s).
          </p>
        </div>
      )}

      {isGroupBooking ? (
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
                  onChange={(e) => updateStep1Data('groupName', e.target.value)}
                  disabled={disabled}
                />
              </div>

              {!skipDocuments && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requirements.documents.map((docType) => (
                    <DocumentUpload
                      key={docType}
                      label={docType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      required
                      file={data.passengers[0]?.[docType as keyof Passenger] as File}
                      onChange={(file) => {
                        const updatedPassengers = [...data.passengers];
                        updatedPassengers[0] = { ...updatedPassengers[0], [docType]: file };
                        onChange({ passengers: updatedPassengers });
                      }}
                      disabled={disabled}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={addPassenger}
              disabled={step3Data.accommodationType === 'iqama' && data.passengers.length >= BOOKING_LIMITS.MAX_PASSENGERS_IQAMA}
            >
              <Users className="h-4 w-4 mr-2" />
              Add Passenger
              {step3Data.accommodationType === 'iqama' && ` (${data.passengers.length}/${BOOKING_LIMITS.MAX_PASSENGERS_IQAMA})`}
            </Button>
          </div>

          <div className="space-y-4">
            {data.passengers.map((passenger, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="font-medium">
                    Passenger {index + 1} {passenger.isLeadPassenger && '(Lead Passenger)'}
                  </h5>
                  <div className="flex items-center space-x-2">
                    {index === 0 && (
                      <div className="flex items-center space-x-2 mr-4">
                        <input
                          type="checkbox"
                          id={`lead-${index}`}
                          checked={passenger.isLeadPassenger}
                          onChange={(e) => updatePassenger(index, 'isLeadPassenger', e.target.checked)}
                          className="rounded"
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
                        onClick={() => removePassenger(index)}
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

                  {!skipDocuments && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {passenger.isLeadPassenger ? (
                        <>
                          {/* Lead Passenger - Always Required */}
                          <DocumentUpload
                            label="PAN Card Photo"
                            required
                            file={passenger.panCardPhoto}
                            onChange={(file) => updatePassenger(index, 'panCardPhoto', file)}
                            disabled={disabled}
                          />
                          <DocumentUpload
                            label="Passport Front"
                            required
                            file={passenger.passportFront}
                            onChange={(file) => updatePassenger(index, 'passportFront', file)}
                            disabled={disabled}
                          />
                          <DocumentUpload
                            label="Passport Back"
                            required
                            file={passenger.passportBack}
                            onChange={(file) => updatePassenger(index, 'passportBack', file)}
                            disabled={disabled}
                          />
                          
                          {/* Conditional Documents for Lead Passenger */}
                          {step3Data.accommodationType === 'iqama' && (
                            <DocumentUpload
                              label="Iqama Photo"
                              required
                              file={passenger.iqamaPhoto}
                              onChange={(file) => updatePassenger(index, 'iqamaPhoto', file)}
                              disabled={disabled}
                            />
                          )}
                          
                          {step3Data.accommodationType === 'hotel' && (
                            <DocumentUpload
                              label="Hotel Booking"
                              required
                              file={passenger.hotelBooking}
                              onChange={(file) => updatePassenger(index, 'hotelBooking', file)}
                              disabled={disabled}
                            />
                          )}
                          
                          {/* Note: hasTransportation check would need to be passed from parent */}
                          {step3Data.accommodationType === 'hotel' && (
                            <DocumentUpload
                              label="Ticket Copy"
                              required
                              file={passenger.ticketCopy}
                              onChange={(file) => updatePassenger(index, 'ticketCopy', file)}
                              disabled={disabled}
                            />
                          )}
                        </>
                      ) : (
                        <>
                          {/* Other Passengers - Basic Requirements */}
                          <DocumentUpload
                            label="Passport Front"
                            required
                            file={passenger.passportFront}
                            onChange={(file) => updatePassenger(index, 'passportFront', file)}
                            disabled={disabled}
                          />
                          <DocumentUpload
                            label="Passport Back"
                            required
                            file={passenger.passportBack}
                            onChange={(file) => updatePassenger(index, 'passportBack', file)}
                            disabled={disabled}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {skipDocuments && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Development Mode Active:</strong> Documents will not be uploaded. 
            This booking will be created without passenger documents for testing purposes only.
            <br />
            <strong>Note:</strong> In production, all required documents must be uploaded.
          </p>
        </div>
      )}

      {!skipDocuments && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Required Documents:</strong>
            <br />• {requirements.description}
            <br />• Supported formats: Images (JPG, PNG) and PDF
          </p>
        </div>
      )}
    </div>
  );
};
