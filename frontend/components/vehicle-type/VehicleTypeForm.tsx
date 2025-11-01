'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface VehicleTypeMaster {
  id: string;
  vehicleName: string;
  paxCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateVehicleTypeMasterRequest {
  vehicleName: string;
  paxCount: number;
  isActive?: boolean;
}

interface VehicleTypeFormProps {
  formData: CreateVehicleTypeMasterRequest;
  editingVehicleType: VehicleTypeMaster | null;
  onFormDataChange: (data: CreateVehicleTypeMasterRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function VehicleTypeForm({ 
  formData, 
  editingVehicleType, 
  onFormDataChange, 
  onSubmit, 
  onCancel 
}: VehicleTypeFormProps) {
  const handleInputChange = (field: keyof CreateVehicleTypeMasterRequest, value: string | number | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="vehicleName">Vehicle Name *</Label>
          <Input
            id="vehicleName"
            placeholder="e.g., Lexus ES 250, Coach Bus VIP, GMC"
            value={formData.vehicleName}
            onChange={(e) => handleInputChange('vehicleName', e.target.value)}
            required
          />
          <p className="text-xs text-gray-500">Enter the vehicle name or model</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paxCount">Passenger Count (PAX) *</Label>
          <Input
            id="paxCount"
            type="number"
            min="1"
            max="100"
            placeholder="e.g., 3, 7, 30"
            value={formData.paxCount || ''}
            onChange={(e) => handleInputChange('paxCount', parseInt(e.target.value) || 0)}
            required
          />
          <p className="text-xs text-gray-500">Maximum number of passengers this vehicle can accommodate</p>
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
            {editingVehicleType ? 'Update Vehicle Type' : 'Create Vehicle Type'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

