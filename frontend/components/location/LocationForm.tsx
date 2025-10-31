'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LocationMaster, LocationType, CreateLocationMasterRequest } from '@/types';

interface LocationFormProps {
  formData: CreateLocationMasterRequest;
  editingLocation: LocationMaster | null;
  countries: any[];
  onFormDataChange: (data: CreateLocationMasterRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function LocationForm({ 
  formData, 
  editingLocation, 
  countries,
  onFormDataChange, 
  onSubmit, 
  onCancel 
}: LocationFormProps) {
  console.log('LocationForm countries:', countries);
  
  const handleInputChange = (field: keyof CreateLocationMasterRequest, value: string | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Code *</Label>
          <Input
            id="code"
            placeholder="e.g., JED, MAK, MED"
            value={formData.code}
            onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
            required
            maxLength={20}
          />
          <p className="text-xs text-gray-500">Unique code for this location</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            placeholder="e.g., King Abdulaziz Airport, Makkah"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="locationType">Location Type *</Label>
          <Select 
            value={formData.locationType} 
            onValueChange={(value: LocationType) => handleInputChange('locationType', value)}
            disabled={!!editingLocation}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select location type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AIRPORT">Airport</SelectItem>
              <SelectItem value="DESTINATION">Destination</SelectItem>
              <SelectItem value="ZIYARAT">Ziyarat</SelectItem>
            </SelectContent>
          </Select>
          {editingLocation && (
            <p className="text-xs text-gray-500">Location type cannot be changed after creation</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country *</Label>
          <Select 
            value={formData.countryId} 
            onValueChange={(value) => handleInputChange('countryId', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries && countries.length > 0 ? (
                countries
                  .filter(c => c.isActive)
                  .map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.countryName} ({country.countryCode})
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value="no-countries" disabled>
                  No countries available. Please add countries first.
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            placeholder="e.g., Jeddah, Makkah, Madinah"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => handleInputChange('isActive', checked)}
          />
          <Label htmlFor="isActive">Active Location</Label>
        </div>

        <div className="flex space-x-2 pt-4">
          <Button type="submit" className="flex-1">
            {editingLocation ? 'Update Location' : 'Create Location'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

