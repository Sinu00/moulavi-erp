'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TransportMaster, CreateTransportMasterRequest } from '@/types';

interface TransportFormProps {
  formData: CreateTransportMasterRequest;
  editingTransport: TransportMaster | null;
  routes: any[];
  vehicleTypes: any[];
  onFormDataChange: (data: CreateTransportMasterRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function TransportForm({ 
  formData, 
  editingTransport, 
  routes,
  vehicleTypes,
  onFormDataChange, 
  onSubmit, 
  onCancel 
}: TransportFormProps) {
  const handleInputChange = (field: keyof CreateTransportMasterRequest, value: string | number | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  const getRouteString = (route: any) => {
    if (!route) return '';
    const cities = [
      route.city1?.name,
      route.city2?.name,
      route.city3?.name,
      route.city4?.name,
    ].filter(Boolean);
    return cities.join(' → ');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="routeId">Route *</Label>
          <Select 
            value={formData.routeId} 
            onValueChange={(value) => handleInputChange('routeId', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select route" />
            </SelectTrigger>
            <SelectContent>
              {routes && routes.length > 0 ? (
                routes
                  .filter(r => r.isActive)
                  .map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {getRouteString(route)} ({route.routeType})
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value="no-routes" disabled>
                  No routes available. Please add routes first.
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicleTypeId">Vehicle Type *</Label>
          <Select 
            value={formData.vehicleTypeId} 
            onValueChange={(value) => handleInputChange('vehicleTypeId', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select vehicle type" />
            </SelectTrigger>
            <SelectContent>
              {vehicleTypes && vehicleTypes.length > 0 ? (
                vehicleTypes
                  .filter(v => v.isActive)
                  .map((vehicleType) => (
                    <SelectItem key={vehicleType.id} value={vehicleType.id}>
                      {vehicleType.vehicleName} ({vehicleType.paxCount} PAX)
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value="no-vehicles" disabled>
                  No vehicle types available. Please add vehicle types first.
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.price}
            onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive ?? true}
            onCheckedChange={(checked) => handleInputChange('isActive', checked)}
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Active
          </Label>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {editingTransport ? 'Update Transport' : 'Create Transport'}
          </Button>
        </div>
      </form>
    </div>
  );
}

