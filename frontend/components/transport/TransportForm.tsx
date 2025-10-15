'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DestinationMaster } from '@/types';

interface TransportMaster {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  vehicleType: string;
  paxCount: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fromLocation?: {
    id: string;
    destinationName: string;
    city: string;
  };
  toLocation?: {
    id: string;
    destinationName: string;
    city: string;
  };
}

interface CreateTransportMasterRequest {
  fromLocationId: string;
  toLocationId: string;
  vehicleType: string;
  paxCount: number;
  price: number;
  isActive?: boolean;
}

interface TransportFormProps {
  formData: CreateTransportMasterRequest;
  editingTransport: TransportMaster | null;
  destinations: DestinationMaster[];
  onFormDataChange: (data: CreateTransportMasterRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const VEHICLE_TYPES = [
  'Lexus ES 250',
  'GMC',
  'Staria',
  'Hiace',
  'Bus',
  'Van',
  'SUV'
];

export default function TransportForm({ 
  formData, 
  editingTransport, 
  destinations,
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
              {destinations.map((destination) => (
                <SelectItem key={destination.id} value={destination.id}>
                  {destination.destinationName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              {destinations.map((destination) => (
                <SelectItem key={destination.id} value={destination.id}>
                  {destination.destinationName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicleType">Vehicle Type *</Label>
          <Select 
            value={formData.vehicleType} 
            onValueChange={(value) => handleInputChange('vehicleType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select vehicle type" />
            </SelectTrigger>
            <SelectContent>
              {VEHICLE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paxCount">Passenger Count *</Label>
          <Input
            id="paxCount"
            type="number"
            min="1"
            max="50"
            placeholder="e.g., 5"
            value={formData.paxCount || ''}
            onChange={(e) => handleInputChange('paxCount', parseInt(e.target.value) || 0)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price (SAR) *</Label>
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
