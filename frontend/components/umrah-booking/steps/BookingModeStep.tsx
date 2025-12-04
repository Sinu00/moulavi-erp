// Step 1: Booking Mode Component

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Step1Data } from '@/lib/umrah/types';
import { partyAPI } from '@/lib/api';
import { Party } from '@/types';

interface BookingModeStepProps {
  data: Step1Data;
  onChange: (data: Partial<Step1Data>) => void;
  disabled?: boolean;
}

export const BookingModeStep: React.FC<BookingModeStepProps> = ({
  data,
  onChange,
  disabled = false,
}) => {
  const [umrahVisaProviders, setUmrahVisaProviders] = useState<Party[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  useEffect(() => {
    const loadUmrahVisaProviders = async () => {
      setLoadingProviders(true);
      try {
        const response = await partyAPI.getAll({ 
          supplier_service_type: 'umrah_service',
          limit: 1000 
        });
        setUmrahVisaProviders(response.data.parties || []);
      } catch (error) {
        console.error('Error loading umrah visa providers:', error);
        setUmrahVisaProviders([]);
      } finally {
        setLoadingProviders(false);
      }
    };

    if (data.bookingMode === 'group_number') {
      loadUmrahVisaProviders();
    }
  }, [data.bookingMode]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-base font-medium">Select Booking Mode *</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              data.bookingMode === 'group_number' 
                ? 'border-red-500 bg-red-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => !disabled && onChange({ bookingMode: 'group_number' })}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full border-2 ${
                data.bookingMode === 'group_number' ? 'border-red-500 bg-red-500' : 'border-gray-300'
              }`} />
              <div>
                <h3 className="font-medium">Group Number</h3>
                <p className="text-sm text-gray-500">I have a masar login</p>
              </div>
            </div>
          </div>
          
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              data.bookingMode === 'travel_details' 
                ? 'border-red-500 bg-red-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => !disabled && onChange({ bookingMode: 'travel_details' })}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full border-2 ${
                data.bookingMode === 'travel_details' ? 'border-red-500 bg-red-500' : 'border-gray-300'
              }`} />
              <div>
                <h3 className="font-medium">Travel Details</h3>
                <p className="text-sm text-gray-500">Booking with travel info</p>
              </div>
            </div>
          </div>
        </div>

        {data.bookingMode === 'group_number' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="groupNumber">Group Number *</Label>
                <Input
                  id="groupNumber"
                  placeholder="Enter group number"
                  value={data.groupNumber || ''}
                  onChange={(e) => onChange({ groupNumber: e.target.value })}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupName">Group Name *</Label>
                <Input
                  id="groupName"
                  placeholder="Enter group name"
                  value={data.groupName || ''}
                  onChange={(e) => onChange({ groupName: e.target.value })}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="umrahVisaProviderId">Umrah Visa Providing Company *</Label>
                <Select
                  value={data.umrahVisaProviderId || ''}
                  onValueChange={(value) => onChange({ umrahVisaProviderId: value })}
                  disabled={disabled || loadingProviders}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingProviders ? "Loading..." : "Select umrah visa provider"} />
                  </SelectTrigger>
                  <SelectContent>
                    {umrahVisaProviders.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.partyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
