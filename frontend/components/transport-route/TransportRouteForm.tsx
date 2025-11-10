'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TransportRouteMaster, RouteType, CreateTransportRouteMasterRequest } from '@/types';

interface TransportRouteFormProps {
  formData: CreateTransportRouteMasterRequest;
  editingRoute: TransportRouteMaster | null;
  cities: any[];
  onFormDataChange: (data: CreateTransportRouteMasterRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function TransportRouteForm({ 
  formData, 
  editingRoute, 
  cities,
  onFormDataChange, 
  onSubmit, 
  onCancel 
}: TransportRouteFormProps) {
  const handleInputChange = (field: keyof CreateTransportRouteMasterRequest, value: string | boolean | null) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  const getRouteTypeLabel = (type: RouteType) => {
    const labels: Record<RouteType, string> = {
      citytocity: 'City to City',
      airporttocity: 'Airport to City',
      citytoairport: 'City to Airport',
      tripandtour: 'Trip and Tour',
      fulltrip: 'Full Trip',
    };
    return labels[type];
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="routeType">Route Type *</Label>
          <Select 
            value={formData.routeType} 
            onValueChange={(value: RouteType) => handleInputChange('routeType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select route type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="citytocity">City to City</SelectItem>
              <SelectItem value="airporttocity">Airport to City</SelectItem>
              <SelectItem value="citytoairport">City to Airport</SelectItem>
              <SelectItem value="tripandtour">Trip and Tour</SelectItem>
              <SelectItem value="fulltrip">Full Trip</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city1Id">City 1 *</Label>
          <Select 
            value={formData.city1Id} 
            onValueChange={(value) => handleInputChange('city1Id', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select first city" />
            </SelectTrigger>
            <SelectContent>
              {cities && cities.length > 0 ? (
                cities
                  .filter(c => c.isActive)
                  .map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value="no-cities" disabled>
                  No cities available. Please add cities first.
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city2Id">City 2 *</Label>
          <Select 
            value={formData.city2Id} 
            onValueChange={(value) => handleInputChange('city2Id', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select second city" />
            </SelectTrigger>
            <SelectContent>
              {cities && cities.length > 0 ? (
                cities
                  .filter(c => c.isActive)
                  .map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value="no-cities" disabled>
                  No cities available. Please add cities first.
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city3Id">City 3 (Optional)</Label>
          <Select 
            value={formData.city3Id || 'none'} 
            onValueChange={(value) => handleInputChange('city3Id', value === 'none' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select third city (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {cities && cities.length > 0 ? (
                cities
                  .filter(c => c.isActive)
                  .map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value="no-cities-disabled" disabled>
                  No cities available.
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city4Id">City 4 (Optional)</Label>
          <Select 
            value={formData.city4Id || 'none'} 
            onValueChange={(value) => handleInputChange('city4Id', value === 'none' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select fourth city (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {cities && cities.length > 0 ? (
                cities
                  .filter(c => c.isActive)
                  .map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value="no-cities-disabled" disabled>
                  No cities available.
                </SelectItem>
              )}
            </SelectContent>
          </Select>
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
            {editingRoute ? 'Update Route' : 'Create Route'}
          </Button>
        </div>
      </form>
    </div>
  );
}

