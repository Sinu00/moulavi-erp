'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CountryMaster, CreateCountryMasterRequest } from '@/types';

interface CountryFormProps {
  formData: CreateCountryMasterRequest;
  editingCountry: CountryMaster | null;
  currencies: any[];
  onFormDataChange: (data: CreateCountryMasterRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function CountryForm({ 
  formData, 
  editingCountry, 
  currencies,
  onFormDataChange, 
  onSubmit, 
  onCancel 
}: CountryFormProps) {
  console.log('CountryForm currencies:', currencies);
  
  const handleInputChange = (field: keyof CreateCountryMasterRequest, value: string) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="countryCode">Country Code *</Label>
          <Input
            id="countryCode"
            placeholder="e.g., SAU, IND, UAE"
            value={formData.countryCode}
            onChange={(e) => handleInputChange('countryCode', e.target.value.toUpperCase())}
            required
            maxLength={3}
          />
          <p className="text-xs text-gray-500">ISO 3-letter country code (e.g., SAU for Saudi Arabia)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="countryName">Country Name *</Label>
          <Input
            id="countryName"
            placeholder="e.g., Saudi Arabia, India, United Arab Emirates"
            value={formData.countryName}
            onChange={(e) => handleInputChange('countryName', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currencyCode">Currency *</Label>
          <Select 
            value={formData.currencyCode} 
            onValueChange={(value) => handleInputChange('currencyCode', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies && currencies.length > 0 ? (
                currencies.map((currency) => (
                  <SelectItem key={currency.id} value={currency.currencyCode}>
                    {currency.currencyCode} - {currency.currencyName}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-currencies" disabled>
                  No currencies available. Please add currencies first.
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Select the primary currency for this country</p>
        </div>

        <div className="flex space-x-2 pt-4">
          <Button type="submit" className="flex-1">
            {editingCountry ? 'Update Country' : 'Create Country'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

