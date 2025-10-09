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
import { ArrowLeft, Upload, Check, User, FileText, Calendar, ChevronRight, ChevronLeft } from 'lucide-react';

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
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
    setValue,
    watch,
  } = useForm<UmrahVisaFormData>({
    resolver: zodResolver(umrahVisaSchema),
    defaultValues: {
      gender: 'male'
    }
  });

  const steps = [
    {
      id: 1,
      title: 'Personal Information',
      description: 'Basic personal details',
      icon: User,
      fields: ['full_name', 'date_of_birth', 'gender', 'phone_number', 'nationality']
    },
    {
      id: 2,
      title: 'Passport Details',
      description: 'Passport information',
      icon: FileText,
      fields: ['passport_number', 'passport_expiry']
    },
    {
      id: 3,
      title: 'Travel Dates',
      description: 'Travel itinerary',
      icon: Calendar,
      fields: ['travel_date_from', 'travel_date_to']
    },
    {
      id: 4,
      title: 'Documents',
      description: 'Upload required documents',
      icon: Upload,
      fields: []
    }
  ];

  useEffect(() => {
    if (!user || !hasRole('party')) {
      router.push('/party-auth');
      return;
    }

    loadPartyInfo();
  }, [user, router]);

  const loadPartyInfo = async () => {
    try {
      // Get current user's party information
      const response = await partyAPI.getMyParty();
      const userParty = response.data.party;
      
      if (userParty) {
        setPartyId(userParty.id);
      } else {
        toast.error('Party information not found');
      }
    } catch (error) {
      console.error('Error loading party info:', error);
      toast.error('Failed to load party information');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(Array.from(e.target.files));
    }
  };

  const nextStep = async () => {
    const currentStepData = steps.find(step => step.id === currentStep);
    if (currentStepData && currentStepData.fields.length > 0) {
      const isValid = await trigger(currentStepData.fields as any);
      if (!isValid) {
        return;
      }
    }
    
    setCompletedSteps(prev => [...prev, currentStep]);
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const goToStep = (stepId: number) => {
    // Only allow going to completed steps or the next step
    if (stepId <= currentStep || completedSteps.includes(stepId)) {
      setCurrentStep(stepId);
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
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
                <Select 
                  value={watch('gender')} 
                  onValueChange={(value: 'male' | 'female') => {
                    setValue('gender', value);
                    setGender(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p className="text-sm text-red-600">{errors.gender.message}</p>
                )}
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

              <div className="space-y-2 md:col-span-2">
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
        );

      case 2:
        return (
          <div className="space-y-6">
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
        );

      case 3:
        return (
          <div className="space-y-6">
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
        );

      case 4:
        return (
          <div className="space-y-6">
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
              <p className="text-sm text-gray-500">
                Supported formats: JPG, PNG, PDF. Maximum file size: 10MB per file.
              </p>
            </div>
          </div>
        );

      default:
        return null;
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
              Complete the steps below to apply for your Umrah visa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = completedSteps.includes(step.id);
                  const isCurrent = currentStep === step.id;
                  const isAccessible = step.id <= currentStep || completedSteps.includes(step.id);
                  
                  return (
                    <div key={step.id} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => goToStep(step.id)}
                          disabled={!isAccessible}
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                            isCompleted
                              ? 'bg-green-500 border-green-500 text-white'
                              : isCurrent
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : isAccessible
                              ? 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                              : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <Icon className="h-5 w-5" />
                          )}
                        </button>
                        <div className="mt-2 text-center">
                          <p className={`text-sm font-medium ${
                            isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {step.title}
                          </p>
                          <p className="text-xs text-gray-400">{step.description}</p>
                        </div>
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-4 ${
                          completedSteps.includes(step.id) ? 'bg-green-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            <div className="mb-8">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                  {steps[currentStep - 1].title}
                </h3>
                {renderStepContent()}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <div className="flex space-x-3">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={isLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/party/dashboard')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>

              <div className="flex space-x-3">
                {currentStep < steps.length ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={isLoading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit(onSubmit)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Submitting...' : 'Submit Application'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

