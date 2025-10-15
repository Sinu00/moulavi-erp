'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface AirportMaster {
  id: string;
  airportCode: string;
  airportName: string;
  city: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateAirportMasterRequest {
  airportCode: string;
  airportName: string;
  city: string;
  country: string;
  isActive?: boolean;
}

interface AirportFormProps {
  formData: CreateAirportMasterRequest;
  editingAirport: AirportMaster | null;
  onFormDataChange: (data: CreateAirportMasterRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function AirportForm({ 
  formData, 
  editingAirport, 
  onFormDataChange, 
  onSubmit, 
  onCancel 
}: AirportFormProps) {
  const handleInputChange = (field: keyof CreateAirportMasterRequest, value: string | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="airportCode">Airport Code *</Label>
          <Input
            id="airportCode"
            placeholder="e.g., JED"
            value={formData.airportCode}
            onChange={(e) => handleInputChange('airportCode', e.target.value.toUpperCase())}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="airportName">Airport Name *</Label>
          <Input
            id="airportName"
            placeholder="e.g., King Abdulaziz International Airport"
            value={formData.airportName}
            onChange={(e) => handleInputChange('airportName', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            placeholder="e.g., Jeddah"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country *</Label>
          <Input
            id="country"
            placeholder="e.g., Saudi Arabia"
            value={formData.country}
            onChange={(e) => handleInputChange('country', e.target.value)}
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => handleInputChange('isActive', checked)}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>

        <div className="flex space-x-2 pt-4">
          <Button type="submit" className="flex-1">
            {editingAirport ? 'Update' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
