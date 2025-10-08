'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { partyAPI } from '@/lib/api';

const partySchema = z.object({
  party_name: z.string().min(1, 'Party name is required'),
  email: z.string().email('Invalid email address'),
  contact_number: z.string().optional(),
  whatsapp_number: z.string().optional(),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  customer_type: z.enum(['direct', 'b2b']),
  account_currency: z.enum(['SAR', 'INR', 'AED']),
  is_supplier: z.boolean().optional(),
  is_customer: z.boolean().optional(),
  login_required: z.boolean().optional(),
});

type PartyFormData = z.infer<typeof partySchema>;

interface CreatePartyDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePartyDialog({ open, onClose, onSuccess }: CreatePartyDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [customerType, setCustomerType] = useState<'direct' | 'b2b'>('direct');
  const [currency, setCurrency] = useState<'SAR' | 'INR' | 'AED'>('INR');
  const [loginRequired, setLoginRequired] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartyFormData>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      customer_type: 'direct',
      account_currency: 'INR',
      is_customer: true,
      is_supplier: false,
      login_required: false,
    },
  });

  const onSubmit = async (data: PartyFormData) => {
    setIsLoading(true);

    try {
      const response = await partyAPI.create({
        ...data,
        customer_type: customerType,
        account_currency: currency,
        login_required: loginRequired,
      });

      toast.success('Party created successfully!');
      if (loginRequired) {
        toast.info('Login credentials have been sent to the party email.');
      }
      
      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating party:', error);
      toast.error(error.response?.data?.error || 'Failed to create party');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Create New Party</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="party_name">Party Name *</Label>
                <Input
                  id="party_name"
                  placeholder="Enter party name"
                  {...register('party_name')}
                  disabled={isLoading}
                />
                {errors.party_name && (
                  <p className="text-sm text-red-600">{errors.party_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="party@example.com"
                  {...register('email')}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_number">Contact Number</Label>
                <Input
                  id="contact_number"
                  placeholder="+91 1234567890"
                  {...register('contact_number')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
                <Input
                  id="whatsapp_number"
                  placeholder="+91 1234567890"
                  {...register('whatsapp_number')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_type">Customer Type *</Label>
                <Select value={customerType} onValueChange={(value: any) => setCustomerType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="b2b">B2B</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_currency">Account Currency *</Label>
                <Select value={currency} onValueChange={(value: any) => setCurrency(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter full address"
                  {...register('address')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input
                  id="gst_number"
                  placeholder="GST Number"
                  {...register('gst_number')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2 flex items-center">
                <input
                  type="checkbox"
                  id="login_required"
                  checked={loginRequired}
                  onChange={(e) => setLoginRequired(e.target.checked)}
                  className="mr-2"
                  disabled={isLoading}
                />
                <Label htmlFor="login_required" className="cursor-pointer">
                  Create login account for party
                </Label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Party'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

