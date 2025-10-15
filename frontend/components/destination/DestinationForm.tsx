'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface DestinationMaster {
  id: string;
  destinationCode: string;
  destinationName: string;
  city: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateDestinationMasterRequest {
  destinationCode: string;
  destinationName: string;
  city: string;
  country: string;
  isActive?: boolean;
}

interface DestinationFormProps {
  formData: CreateDestinationMasterRequest;
  editingDestination: DestinationMaster | null;
  onFormDataChange: (data: CreateDestinationMasterRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function DestinationForm({ 
  formData, 
  editingDestination, 
  onFormDataChange, 
  onSubmit, 
  onCancel 
}: DestinationFormProps) {
  const handleInputChange = (field: keyof CreateDestinationMasterRequest, value: string | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="destinationCode">Destination Code *</Label>
          <Input
            id="destinationCode"
            placeholder="e.g., MAK"
            value={formData.destinationCode}
            onChange={(e) => handleInputChange('destinationCode', e.target.value.toUpperCase())}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="destinationName">Destination Name *</Label>
          <Input
            id="destinationName"
            placeholder="e.g., Makkah"
            value={formData.destinationName}
            onChange={(e) => handleInputChange('destinationName', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            placeholder="e.g., Makkah"
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
            {editingDestination ? 'Update' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
