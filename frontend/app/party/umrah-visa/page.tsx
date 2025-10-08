'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUser, hasRole } from '@/lib/auth';
import { serviceAPI, partyAPI, uploadAPI } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { ArrowLeft, Upload } from 'lucide-react';

const umrahVisaSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  passport_number: z.string().min(1, 'Passport number is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  travel_date_from: z.string().min(1, 'Travel start date is required'),
  travel_date_to: z.string().min(1, 'Travel end date is required'),
  passport_expiry: z.string().min(1, 'Passport expiry date is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female']),
  phone_number: z.string().optional(),
});

type UmrahVisaFormData = z.infer<typeof umrahVisaSchema>;

export default function UmrahVisaPage() {
  const router = useRouter();
  const user = getUser();
  const [isLoading, setIsLoading] = useState(false);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [documents, setDocuments] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UmrahVisaFormData>({
    resolver: zodResolver(umrahVisaSchema),
  });

  useEffect(() => {
    if (!user || !hasRole('party')) {
      router.push('/party-auth');
      return;
    }

    loadPartyInfo();
  }, [user, router]);

  const loadPartyInfo = async () => {
    try {
      // Get parties to find the one linked to this user
      const response = await partyAPI.getAll({ limit: 100 });
      const userParty = response.data.parties.find(
        (p: any) => p.user_id === user?.id
      );
      
      if (userParty) {
        setPartyId(userParty.id);
      } else {
        toast.error('Party information not found');
      }
    } catch (error) {
      // Error handling is done by the API interceptor
      toast.error('Failed to load party information');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(Array.from(e.target.files));
    }
  };

  const onSubmit = async (data: UmrahVisaFormData) => {
    if (!partyId) {
      toast.error('Party information not found');
      return;
    }

    setIsLoading(true);

    try {
      // Create service
      const response = await serviceAPI.createUmrahVisa({
        party_id: partyId,
        ...data,
        gender,
      });

      const serviceId = response.data.service.id;

      // Upload documents if any
      if (documents.length > 0) {
        for (const file of documents) {
          try {
            await uploadAPI.uploadDocument(serviceId, file, 'passport');
          } catch (uploadError) {
            // Error handling is done by the API interceptor
            toast.warning(`Failed to upload ${file.name}`);
          }
        }
      }

      toast.success('Umrah visa request submitted successfully!');
      router.push('/party/dashboard');
    } catch (error: any) {
      // Error handling is done by the API interceptor
      toast.error(error.response?.data?.error || 'Failed to submit request');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/party/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Umrah Visa Application</CardTitle>
            <CardDescription>
              Fill in the required information to apply for an Umrah visa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      placeholder="As per passport"
                      {...register('full_name')}
                      disabled={isLoading}
                    />
                    {errors.full_name && (
                      <p className="text-sm text-red-600">{errors.full_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth *</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      {...register('date_of_birth')}
                      disabled={isLoading}
                    />
                    {errors.date_of_birth && (
                      <p className="text-sm text-red-600">{errors.date_of_birth.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={gender} onValueChange={(value: any) => setGender(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      type="tel"
                      placeholder="+91 1234567890"
                      {...register('phone_number')}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationality *</Label>
                    <Input
                      id="nationality"
                      placeholder="e.g., Indian"
                      {...register('nationality')}
                      disabled={isLoading}
                    />
                    {errors.nationality && (
                      <p className="text-sm text-red-600">{errors.nationality.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Passport Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Passport Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="passport_number">Passport Number *</Label>
                    <Input
                      id="passport_number"
                      placeholder="Passport Number"
                      {...register('passport_number')}
                      disabled={isLoading}
                    />
                    {errors.passport_number && (
                      <p className="text-sm text-red-600">{errors.passport_number.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passport_expiry">Passport Expiry Date *</Label>
                    <Input
                      id="passport_expiry"
                      type="date"
                      {...register('passport_expiry')}
                      disabled={isLoading}
                    />
                    {errors.passport_expiry && (
                      <p className="text-sm text-red-600">{errors.passport_expiry.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Travel Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Travel Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="travel_date_from">Travel Start Date *</Label>
                    <Input
                      id="travel_date_from"
                      type="date"
                      {...register('travel_date_from')}
                      disabled={isLoading}
                    />
                    {errors.travel_date_from && (
                      <p className="text-sm text-red-600">{errors.travel_date_from.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="travel_date_to">Travel End Date *</Label>
                    <Input
                      id="travel_date_to"
                      type="date"
                      {...register('travel_date_to')}
                      disabled={isLoading}
                    />
                    {errors.travel_date_to && (
                      <p className="text-sm text-red-600">{errors.travel_date_to.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Document Upload</h3>
                <div className="space-y-2">
                  <Label htmlFor="documents">Upload Documents (Passport, Photo, etc.)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="documents"
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      disabled={isLoading}
                    />
                    <Upload className="h-5 w-5 text-gray-400" />
                  </div>
                  {documents.length > 0 && (
                    <p className="text-sm text-green-600">
                      {documents.length} file(s) selected
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/party/dashboard')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

