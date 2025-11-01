'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LocationMaster } from '@/types';

interface VehicleTypeMaster {
  id: string;
  vehicleName: string;
  paxCount: number;
  isActive: boolean;
}

interface TransportMaster {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  vehicleTypeId: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fromLocation?: {
    id: string;
    name: string;
    city: string;
  };
  toLocation?: {
    id: string;
    name: string;
    city: string;
  };
  vehicleType?: VehicleTypeMaster;
}

interface CreateTransportMasterRequest {
  fromLocationId: string;
  toLocationId: string;
  vehicleTypeId: string;
  price: number;
  isActive?: boolean;
}

interface TransportFormProps {
  formData: CreateTransportMasterRequest;
  editingTransport: TransportMaster | null;
  destinations: LocationMaster[];
  vehicleTypes: VehicleTypeMaster[];
  onFormDataChange: (data: CreateTransportMasterRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function TransportForm({ 
  formData, 
  editingTransport, 
  destinations,
  vehicleTypes,
  onFormDataChange, 
  onSubmit, 
  onCancel 
}: TransportFormProps) {
  const handleInputChange = (field: keyof CreateTransportMasterRequest, value: string | number | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fromLocationId">From Location *</Label>
          <Select 
            value={formData.fromLocationId} 
            onValueChange={(value) => handleInputChange('fromLocationId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select from location" />
            </SelectTrigger>
            <SelectContent>
              {destinations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name} ({location.locationType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Select any location type (Airport, Destination, or Ziyarat)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="toLocationId">To Location *</Label>
          <Select 
            value={formData.toLocationId} 
            onValueChange={(value) => handleInputChange('toLocationId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select to location" />
            </SelectTrigger>
            <SelectContent>
              {destinations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name} ({location.locationType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Select any location type (Airport, Destination, or Ziyarat)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicleTypeId">Vehicle Type *</Label>
          <Select 
            value={formData.vehicleTypeId} 
            onValueChange={(value) => handleInputChange('vehicleTypeId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select vehicle type" />
            </SelectTrigger>
            <SelectContent>
              {vehicleTypes.filter(vt => vt.isActive).map((vehicleType) => (
                <SelectItem key={vehicleType.id} value={vehicleType.id}>
                  {vehicleType.vehicleName} ({vehicleType.paxCount} PAX)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Select a vehicle type from the master list</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price (INR) *</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g., 500.00"
            value={formData.price || ''}
            onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
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
            {editingTransport ? 'Update' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
