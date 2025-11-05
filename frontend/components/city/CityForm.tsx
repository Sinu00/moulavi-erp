'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CityMaster, CreateCityMasterRequest } from '@/types';

interface CityFormProps {
  formData: CreateCityMasterRequest;
  editingCity: CityMaster | null;
  countries: Array<{ id: string; countryCode: string; countryName: string }>;
  onFormDataChange: (data: CreateCityMasterRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function CityForm({ 
  formData, 
  editingCity, 
  countries,
  onFormDataChange, 
  onSubmit, 
  onCancel 
}: CityFormProps) {
  const handleInputChange = (field: keyof CreateCityMasterRequest, value: string | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">City Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Makkah, Madinah, Jeddah"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
          <p className="text-xs text-gray-500">Enter the city name</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="countryId">Country *</Label>
          <Select
            value={formData.countryId}
            onValueChange={(value) => handleInputChange('countryId', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {countries.length === 0 ? (
                <SelectItem value="loading" disabled>Loading countries...</SelectItem>
              ) : (
                countries.map((country) => (
                  <SelectItem key={country.id} value={country.id}>
                    {country.countryCode} - {country.countryName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Select the country this city belongs to</p>
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
            {editingCity ? 'Update City' : 'Create City'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

