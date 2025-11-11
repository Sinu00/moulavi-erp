import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Passenger, Step1Data, Step3Data } from '@/lib/umrah/types';
import { DocumentUpload } from '../shared';

interface PassengerCardProps {
  passenger: Passenger;
  index: number;
  step1Data: Step1Data;
  step3Data: Step3Data;
  onUpdate: (field: keyof Passenger, value: any) => void;
  onRemove?: () => void;
  disabled?: boolean;
}

export const PassengerCard: React.FC<PassengerCardProps> = ({
  passenger,
  index,
  step1Data,
  step3Data,
  onUpdate,
  onRemove,
  disabled = false,
}) => {
  const hasGroupNumber = step1Data.bookingMode === 'group_number';

  // Determine which documents to show based on booking mode and passenger type
  const shouldShowDocuments = () => {
    if (hasGroupNumber) {
      // With group number: Only lead passenger needs documents
      return passenger.isLeadPassenger;
    } else {
      // Without group number: All passengers need documents
      return true;
    }
  };

  const renderDocuments = () => {
    if (!shouldShowDocuments()) {
      return null;
    }

    if (hasGroupNumber && passenger.isLeadPassenger) {
      // Group number mode: Lead passenger only
      if (step3Data.accommodationType === 'hotel') {
        // Hotel: PAN + Ticket + Hotel
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DocumentUpload
              label="PAN Card *"
              required
              file={passenger.panCardPhoto || null}
              onChange={(file) => onUpdate('panCardPhoto', file)}
              disabled={disabled}
            />
            <DocumentUpload
              label="Ticket Copy *"
              required
              file={passenger.ticketCopy || null}
              onChange={(file) => onUpdate('ticketCopy', file)}
              disabled={disabled}
            />
            <DocumentUpload
              label="Hotel Copy *"
              required
              file={passenger.hotelBooking || null}
              onChange={(file) => onUpdate('hotelBooking', file)}
              disabled={disabled}
            />
          </div>
        );
      } else {
        // Iqama: PAN + Iqama
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DocumentUpload
              label="PAN Card *"
              required
              file={passenger.panCardPhoto || null}
              onChange={(file) => onUpdate('panCardPhoto', file)}
              disabled={disabled}
            />
            <DocumentUpload
              label="Iqama Copy *"
              required
              file={passenger.iqamaPhoto || null}
              onChange={(file) => onUpdate('iqamaPhoto', file)}
              disabled={disabled}
            />
          </div>
        );
      }
    } else {
      // Travel details mode: All passengers need passport, lead needs PAN
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DocumentUpload
            label="Passport Front *"
            required
            file={passenger.passportFront || null}
            onChange={(file) => onUpdate('passportFront', file)}
            disabled={disabled}
          />
          <DocumentUpload
            label="Passport Back *"
            required
            file={passenger.passportBack || null}
            onChange={(file) => onUpdate('passportBack', file)}
            disabled={disabled}
          />
          {passenger.isLeadPassenger && (
            <DocumentUpload
              label="PAN Card *"
              required
              file={passenger.panCardPhoto || null}
              onChange={(file) => onUpdate('panCardPhoto', file)}
              disabled={disabled}
            />
          )}
        </div>
      );
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h5 className="font-medium">
          Passenger {index + 1} {passenger.isLeadPassenger && <span className="text-red-600">(Lead Passenger)</span>}
        </h5>
        <div className="flex items-center space-x-2">
          {index === 0 && (
            <div className="flex items-center space-x-2 mr-4">
              <input
                type="checkbox"
                id={`lead-${index}`}
                checked={passenger.isLeadPassenger}
                onChange={(e) => onUpdate('isLeadPassenger', e.target.checked)}
                className="rounded"
                disabled={disabled}
              />
              <Label htmlFor={`lead-${index}`} className="text-sm">
                Lead Passenger
              </Label>
            </div>
          )}
          {onRemove && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRemove}
              disabled={disabled}
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
            onChange={(e) => onUpdate('fullName', e.target.value)}
            disabled={disabled}
          />
        </div>

        {renderDocuments()}
        
        {hasGroupNumber && !passenger.isLeadPassenger && (
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
            <p>No documents required for this passenger. Documents are only required for the lead passenger when booking with a group number.</p>
          </div>
        )}
      </div>
    </Card>
  );
};
