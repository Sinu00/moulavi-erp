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
  cities: any[];
  onFormDataChange: (data: CreateLocationMasterRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function LocationForm({ 
  formData, 
  editingLocation, 
  countries,
  cities,
  onFormDataChange, 
  onSubmit, 
  onCancel 
}: LocationFormProps) {
  // Remove excessive logging - only log on mount or when key props change
  // console.log('[LocationForm] Render', {
  //   formData: { ...formData },
  //   editingLocationId: editingLocation?.id,
  //   countriesCount: countries.length,
  //   citiesCount: cities.length
  // });
  
  const handleInputChange = (field: keyof CreateLocationMasterRequest, value: string | boolean) => {
    // Only log actual changes, not every render
    // console.log('[LocationForm] handleInputChange', { field, value });
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
              <SelectItem value="HOTEL">Hotel</SelectItem>
              <SelectItem value="AIRPORT">Airport</SelectItem>
              <SelectItem value="ZIYARAT">Ziyarat</SelectItem>
              <SelectItem value="OTHERS">Others</SelectItem>
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
            onValueChange={(value) => {
              console.log('[LocationForm] Country changed', { value, previousCountryId: formData.countryId });
              // Clear city when country changes
              onFormDataChange({ 
                ...formData, 
                countryId: value,
                cityId: '',
                city: ''
              });
            }}
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
          <Label htmlFor="cityId">City *</Label>
          <Select 
            value={formData.cityId} 
            onValueChange={(value) => {
              console.log('[LocationForm] City changed', { value });
              const selectedCity = cities.find(c => c.id === value);
              onFormDataChange({ 
                ...formData, 
                cityId: value,
                city: selectedCity?.name || formData.city
              });
            }}
            required
            disabled={!formData.countryId}
          >
            <SelectTrigger>
              <SelectValue placeholder={formData.countryId ? "Select city" : "Select country first"} />
            </SelectTrigger>
            <SelectContent>
              {!formData.countryId ? (
                <SelectItem value="select-country-first" disabled>
                  Please select a country first
                </SelectItem>
              ) : cities && cities.length > 0 ? (
                cities
                  .filter(c => c.isActive)
                  .map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value="no-cities" disabled>
                  No cities available for this country. Please add cities first.
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Select the city this location belongs to</p>
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

