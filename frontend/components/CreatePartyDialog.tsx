'use client';

import { useState, useEffect } from 'react';
import { useCurrencyMaster } from '@/hooks/useCurrencyMaster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { partyAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Party, CreatePartyRequest } from '@/types';

interface CreatePartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (partyData: CreatePartyRequest) => Promise<void>;
  editingParty?: Party | null;
  title?: string;
}

export default function CreatePartyDialog({
  open,
  onOpenChange,
  onSubmit,
  editingParty,
  title = 'Create New Party'
}: CreatePartyDialogProps) {
  const [formData, setFormData] = useState({
    party_name: '',
    email: '',
    contact_number: '',
    whatsapp_number: '',
    address: '',
    gst_number: '',
    customer_type: '' as 'direct' | 'b2b' | '',
    account_currency_id: '',
    is_supplier: false,
    is_customer: true,
    login_required: false,
    email_notification: true,
    sms_notification: true,
    marketing_notification: false
  });
  const { currencies, loading: currenciesLoading } = useCurrencyMaster();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes or editing party changes
  useEffect(() => {
    if (open) {
      if (editingParty) {
        setFormData({
          party_name: editingParty.partyName,
          email: editingParty.email,
          contact_number: editingParty.contactNumber || '',
          whatsapp_number: editingParty.whatsappNumber || '',
          address: editingParty.address || '',
          gst_number: editingParty.gstNumber || '',
          customer_type: editingParty.customerType,
          account_currency_id: editingParty.accountCurrencyId,
          is_supplier: editingParty.isSupplier,
          is_customer: editingParty.isCustomer,
          login_required: editingParty.loginRequired,
          email_notification: editingParty.emailNotification,
          sms_notification: editingParty.smsNotification,
          marketing_notification: editingParty.marketingNotification
        });
      } else {
        setFormData({
          party_name: '',
          email: '',
          contact_number: '',
          whatsapp_number: '',
          address: '',
          gst_number: '',
          customer_type: '',
          account_currency_id: currencies.length > 0 ? currencies[0].id : '',
          is_supplier: false,
          is_customer: true,
          login_required: false,
          email_notification: true,
          sms_notification: true,
          marketing_notification: false
        });
      }
      setErrors({});
    }
  }, [open, editingParty]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.party_name.trim()) {
      newErrors.party_name = 'Party name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.customer_type) {
      newErrors.customer_type = 'Customer type is required';
    }

    if (!formData.account_currency_id) {
      newErrors.account_currency_id = 'Account currency is required';
    }

    // Validate contact number format if provided
    if (formData.contact_number && !/^[+]?[0-9]{10,15}$/.test(formData.contact_number)) {
      newErrors.contact_number = 'Contact number must be 10-15 digits, optionally starting with +';
    }

    // Validate WhatsApp number format if provided
    if (formData.whatsapp_number && !/^[+]?[0-9]{10,15}$/.test(formData.whatsapp_number)) {
      newErrors.whatsapp_number = 'WhatsApp number must be 10-15 digits, optionally starting with +';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
      toast.success(editingParty ? 'Party updated successfully' : 'Party created successfully');
    } catch (error: any) {
      console.error('Error submitting party:', error);
      toast.error(error.response?.data?.error || 'Failed to save party');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>{editingParty ? 'Edit Party' : title}</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-4 px-1">
          <form id="party-form" onSubmit={handleSubmit} className="space-y-4 pr-2">
          <div className="space-y-2">
            <Label htmlFor="party_name">Party Name *</Label>
            <Input
              id="party_name"
              type="text"
              value={formData.party_name}
              onChange={(e) => handleInputChange('party_name', e.target.value)}
              placeholder="Enter party name"
              className={errors.party_name ? 'border-red-500' : ''}
            />
            {errors.party_name && (
              <p className="text-sm text-red-500">{errors.party_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_number">Contact Number</Label>
            <Input
              id="contact_number"
              type="text"
              value={formData.contact_number}
              onChange={(e) => handleInputChange('contact_number', e.target.value)}
              placeholder="+91 1234567890"
              className={errors.contact_number ? 'border-red-500' : ''}
            />
            {errors.contact_number && (
              <p className="text-sm text-red-500">{errors.contact_number}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
            <Input
              id="whatsapp_number"
              type="text"
              value={formData.whatsapp_number}
              onChange={(e) => handleInputChange('whatsapp_number', e.target.value)}
              placeholder="+91 1234567890"
              className={errors.whatsapp_number ? 'border-red-500' : ''}
            />
            {errors.whatsapp_number && (
              <p className="text-sm text-red-500">{errors.whatsapp_number}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter full address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gst_number">GST Number</Label>
            <Input
              id="gst_number"
              type="text"
              value={formData.gst_number}
              onChange={(e) => handleInputChange('gst_number', e.target.value)}
              placeholder="GST Number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_type">Customer Type *</Label>
            <Select
              value={formData.customer_type}
              onValueChange={(value) => handleInputChange('customer_type', value)}
            >
              <SelectTrigger className={errors.customer_type ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select customer type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="b2b">B2B</SelectItem>
              </SelectContent>
            </Select>
            {errors.customer_type && (
              <p className="text-sm text-red-500">{errors.customer_type}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_currency_id">Account Currency *</Label>
            <Select
              value={formData.account_currency_id}
              onValueChange={(value) => handleInputChange('account_currency_id', value)}
            >
              <SelectTrigger className={errors.account_currency_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currenciesLoading ? (
                  <SelectItem value="loading" disabled>Loading currencies...</SelectItem>
                ) : (
                  currencies.map((currency) => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.currencyCode} - {currency.currencyName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.account_currency_id && (
              <p className="text-sm text-red-500">{errors.account_currency_id}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Party Type</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_supplier"
                  checked={formData.is_supplier}
                  onChange={(e) => handleInputChange('is_supplier', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="is_supplier" className="cursor-pointer">
                  Supplier
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_customer"
                  checked={formData.is_customer}
                  onChange={(e) => handleInputChange('is_customer', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="is_customer" className="cursor-pointer">
                  Customer
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="login_required"
                checked={formData.login_required}
                onChange={(e) => handleInputChange('login_required', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="login_required" className="cursor-pointer">
                Create login account for party
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notification Preferences</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="email_notification"
                  checked={formData.email_notification}
                  onChange={(e) => handleInputChange('email_notification', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="email_notification" className="cursor-pointer">
                  Email Notifications
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sms_notification"
                  checked={formData.sms_notification}
                  onChange={(e) => handleInputChange('sms_notification', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="sms_notification" className="cursor-pointer">
                  SMS Notifications
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="marketing_notification"
                  checked={formData.marketing_notification}
                  onChange={(e) => handleInputChange('marketing_notification', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="marketing_notification" className="cursor-pointer">
                  Marketing Notifications
                </Label>
              </div>
            </div>
          </div>
          </form>
        </div>

        <SheetFooter className="flex-shrink-0 flex justify-end space-x-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="party-form"
            disabled={loading}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          >
            {loading ? 'Saving...' : (editingParty ? 'Update Party' : 'Create Party')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}