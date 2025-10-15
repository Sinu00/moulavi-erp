'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DestinationMaster } from '@/types';

interface HotelMaster {
  id: string;
  hotelCode: string;
  hotelName: string;
  locationId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  location?: {
    id: string;
    destinationName: string;
    city: string;
  };
}

interface CreateHotelMasterRequest {
  hotelCode: string;
  hotelName: string;
  locationId: string;
  isActive?: boolean;
}

interface HotelFormProps {
  formData: CreateHotelMasterRequest;
  editingHotel: HotelMaster | null;
  destinations: DestinationMaster[];
  onFormDataChange: (data: CreateHotelMasterRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function HotelForm({ 
  formData, 
  editingHotel, 
  destinations,
  onFormDataChange, 
  onSubmit, 
  onCancel 
}: HotelFormProps) {
  const handleInputChange = (field: keyof CreateHotelMasterRequest, value: string | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hotelCode">Hotel Code *</Label>
          <Input
            id="hotelCode"
            placeholder="e.g., MAK001"
            value={formData.hotelCode}
            onChange={(e) => handleInputChange('hotelCode', e.target.value.toUpperCase())}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hotelName">Hotel Name *</Label>
          <Input
            id="hotelName"
            placeholder="e.g., Grand Makkah Hotel"
            value={formData.hotelName}
            onChange={(e) => handleInputChange('hotelName', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="locationId">Location *</Label>
          <Select 
            value={formData.locationId} 
            onValueChange={(value) => handleInputChange('locationId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {destinations.map((destination) => (
                <SelectItem key={destination.id} value={destination.id}>
                  {destination.destinationName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            {editingHotel ? 'Update' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
