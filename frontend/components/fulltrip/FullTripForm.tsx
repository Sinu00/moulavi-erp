'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CityMaster, CreateFullTripMasterRequest, FullTripMaster } from '@/types';
import { X, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

interface VehicleTypeMaster {
  id: string;
  vehicleName: string;
  paxCount: number;
  isActive: boolean;
}

interface FullTripFormProps {
  formData: CreateFullTripMasterRequest;
  editingTrip: FullTripMaster | null;
  cities: CityMaster[];
  vehicleTypes: VehicleTypeMaster[];
  onFormDataChange: (data: CreateFullTripMasterRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function FullTripForm({ 
  formData, 
  editingTrip, 
  cities,
  vehicleTypes,
  onFormDataChange, 
  onSubmit, 
  onCancel 
}: FullTripFormProps) {
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>(formData.toCityIds || []);
  // Track unique IDs for each row to help React with reordering
  const [rowKeys, setRowKeys] = useState<number[]>(() => 
    (formData.toCityIds || []).map((_, idx) => idx)
  );

  const handleInputChange = (field: keyof CreateFullTripMasterRequest, value: string | number | boolean | string[]) => {
    const newFormData = { ...formData, [field]: value };
    if (field === 'toCityIds') {
      const cityIds = value as string[];
      setSelectedCityIds(cityIds);
      // Reset row keys when formData is externally updated (e.g., during edit)
      // Only reset if length changed, otherwise preserve existing keys
      if (cityIds.length !== rowKeys.length) {
        setRowKeys(cityIds.map((_, idx) => idx));
      }
    }
    onFormDataChange(newFormData);
  };

  const handleAddCity = () => {
    // Add an empty string to represent a new empty slot
    const newCityIds = [...selectedCityIds, ''];
    const newRowKeys = [...rowKeys, Date.now()]; // Use timestamp as unique key for new row
    setSelectedCityIds(newCityIds);
    setRowKeys(newRowKeys);
    // Don't update formData yet - wait until user selects a city
    // The formData will be updated when handleCityChange is called
  };

  const handleRemoveCity = (index: number) => {
    const newCityIds = selectedCityIds.filter((_, i) => i !== index);
    const newRowKeys = rowKeys.filter((_, i) => i !== index);
    setSelectedCityIds(newCityIds);
    setRowKeys(newRowKeys);
    // Filter out empty strings
    const validCityIds = newCityIds.filter(id => id && id !== '');
    handleInputChange('toCityIds', validCityIds);
  };

  const handleCityChange = (index: number, cityId: string) => {
    const newCityIds = [...selectedCityIds];
    newCityIds[index] = cityId;
    setSelectedCityIds(newCityIds);
    // Filter out empty strings when updating formData
    const validCityIds = newCityIds.filter(id => id && id !== '');
    handleInputChange('toCityIds', validCityIds);
  };

  const handleMoveCity = (index: number, direction: 'up' | 'down') => {
    const newCityIds = [...selectedCityIds];
    const newRowKeys = [...rowKeys];
    
    if (direction === 'up' && index > 0) {
      // Swap current item with the one above
      const tempId = newCityIds[index];
      const tempKey = newRowKeys[index];
      newCityIds[index] = newCityIds[index - 1];
      newCityIds[index - 1] = tempId;
      newRowKeys[index] = newRowKeys[index - 1];
      newRowKeys[index - 1] = tempKey;
    } else if (direction === 'down' && index < newCityIds.length - 1) {
      // Swap current item with the one below
      const tempId = newCityIds[index];
      const tempKey = newRowKeys[index];
      newCityIds[index] = newCityIds[index + 1];
      newCityIds[index + 1] = tempId;
      newRowKeys[index] = newRowKeys[index + 1];
      newRowKeys[index + 1] = tempKey;
    }
    
    setSelectedCityIds(newCityIds);
    setRowKeys(newRowKeys);
    // Only update formData with valid city IDs (filter out empty strings)
    const validCityIds = newCityIds.filter(id => id && id !== '');
    handleInputChange('toCityIds', validCityIds);
  };

  // Generate route preview
  const getRoutePreview = () => {
    const fromCity = cities.find(c => c.id === formData.fromCityId);
    const toCities = selectedCityIds
      .filter(id => id && id !== '')
      .map(id => cities.find(c => c.id === id))
      .filter(Boolean) as CityMaster[];
    
    if (!fromCity) return '';
    
    // Display route: From → To1 → To2 → ...
    const routeParts = [fromCity.name, ...toCities.map(c => c.name)];
    return routeParts.join(' → ');
  };

  // Get available cities for a select (allow any city to be selected, including repeats)
  const getAvailableCities = (currentIndex: number) => {
    // Allow all active cities to be selected - no restrictions on duplicates
    return cities.filter(city => city.isActive);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate at least one destination city (filter out empty strings)
    const validCityIds = selectedCityIds.filter(id => id && id !== '');
    if (validCityIds.length === 0) {
      toast.error('Please add at least one destination city');
      return;
    }

    // Update formData with valid city IDs
    const submitData = { ...formData, toCityIds: validCityIds };
    onFormDataChange(submitData);
    onSubmit(e);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fromCityId">From City *</Label>
          <Select 
            value={formData.fromCityId} 
            onValueChange={(value) => handleInputChange('fromCityId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select from city" />
            </SelectTrigger>
            <SelectContent>
              {cities.filter(c => c.isActive).map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name} {city.country && `(${city.country.countryName})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Starting city for the trip</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>To Cities (in order) *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCity}
              className="flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Add City
            </Button>
          </div>
          
          {selectedCityIds.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No destination cities added. Click "Add City" to add destinations.</p>
          ) : (
            <div className="space-y-2">
              {selectedCityIds.map((cityId, index) => (
                <div key={rowKeys[index]} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={cityId || undefined}
                      onValueChange={(value) => handleCityChange(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Destination ${index + 1}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableCities(index).map((city) => (
                          <SelectItem key={city.id} value={city.id}>
                            {city.name} {city.country && `(${city.country.countryName})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveCity(index, 'up')}
                    disabled={index === 0}
                    className="h-9 w-9"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveCity(index, 'down')}
                    disabled={index === selectedCityIds.length - 1}
                    className="h-9 w-9"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCity(index)}
                    className="h-9 w-9 text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500">
            Add cities in the order they will be visited.
          </p>
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
            placeholder="e.g., 30000.00"
            value={formData.price || ''}
            onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
            required
          />
          <p className="text-xs text-gray-500">Total price for the entire trip</p>
        </div>

        {/* Route Preview */}
        {formData.fromCityId && selectedCityIds.some(id => id && id !== '') && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Label className="text-xs text-gray-600 mb-1 block">Route Preview:</Label>
            <p className="text-sm font-medium text-blue-900">{getRoutePreview()}</p>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive ?? true}
            onCheckedChange={(checked) => handleInputChange('isActive', checked)}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>

        <div className="flex space-x-2 pt-4">
          <Button type="submit" className="flex-1">
            {editingTrip ? 'Update' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

