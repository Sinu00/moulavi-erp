'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { umrahVisaAPI, partyAPI, uploadAPI, transportMasterAPI } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { ArrowLeft, Upload, Check, User, FileText, Calendar, ChevronRight, ChevronLeft, Plane, Home, Users } from 'lucide-react';
import { 
  ROUTE_OPTIONS, 
  TRANSPORT_OPTIONS, 
  VALIDATION_RULES, 
  requiresTransport,
  isJeddahRoute,
  getTransportPaxForType,
  validatePassengerCount,
  validateTravelDates,
  BOOKING_STEPS
} from '@/lib/umrahConstants';
import { 
  umrahVisaBookingSchema,
  UmrahVisaBookingFormData,
  PassengerFormData
} from '@/lib/umrahValidation';
import { 
  BookingMode, 
  AccommodationType, 
  CreateUmrahVisaBookingRequest,
  CreateUmrahPassengerRequest 
} from '@/types';

export default function UmrahVisaPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [transportPrice, setTransportPrice] = useState<number | null>(null);
  const [transportOptions, setTransportOptions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<{ [passengerId: string]: File[] }>({});
  const [isClient, setIsClient] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
    setValue,
    watch,
    reset,
  } = useForm<UmrahVisaBookingFormData>({
    resolver: zodResolver(umrahVisaBookingSchema),
    defaultValues: {
      bookingMode: 'group_number',
      accommodationType: 'hotel',
      passengerCount: 1,
      passengers: [{
        isLeadPassenger: true,
        fullName: '',
        passportNumber: '',
        nationality: '',
        passportExpiry: '',
        dateOfBirth: '',
        gender: 'male',
        phoneNumber: ''
      }]
    }
  });

  const steps = [
    {
      id: 1,
      title: 'Booking Mode',
      description: 'Select booking method',
      icon: Users,
      fields: ['bookingMode']
    },
    {
      id: 2,
      title: 'Group & Flight Details',
      description: 'Enter group and flight information',
      icon: Plane,
      fields: ['groupNumber', 'groupName', 'flightNumber', 'arrivalDate', 'departureDate', 'arrivalAirport']
    },
    {
      id: 3,
      title: 'Transport Details',
      description: 'Select transport options',
      icon: Plane,
      fields: ['transportRoute', 'transportType', 'transportPax']
    },
    {
      id: 4,
      title: 'Accommodation',
      description: 'Choose accommodation type',
      icon: Home,
      fields: ['accommodationType', 'hotelDetails', 'iqamaDetails']
    },
    {
      id: 5,
      title: 'Passenger Details & Documents',
      description: 'Enter passenger information and upload documents',
      icon: User,
      fields: ['passengerCount', 'passengers', 'documents']
    }
  ];

  useEffect(() => {
    // Set client-side flag to prevent hydration mismatch
    setIsClient(true);
    
    // Get user from localStorage on client side only
    const currentUser = getUser();
    setUser(currentUser);
    
    if (!currentUser || !hasRole('party')) {
      router.push('/');
      return;
    }

    loadPartyInfo();
  }, [router]);

  // Load transport options when arrival airport changes
  useEffect(() => {
    const arrivalAirport = watch('arrivalAirport');
    if (arrivalAirport) {
      loadTransportOptions(arrivalAirport);
      // Clear transport selection when route changes
      setValue('transportType', '');
      setValue('transportPax', undefined);
      setTransportPrice(null);
    }
  }, [watch('arrivalAirport')]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, passengerId: string) => {
    if (e.target.files) {
      setDocuments(prev => ({
        ...prev,
        [passengerId]: Array.from(e.target.files!)
      }));
    }
  };

  const nextStep = async () => {
    const currentStepData = steps.find(step => step.id === currentStep);
    if (currentStepData && currentStepData.fields.length > 0) {
      // Special handling for transport step - only validate if it's a Jeddah route
      if (currentStep === 3) {
        const arrivalAirport = getValues('arrivalAirport');
        if (isJeddahRoute(arrivalAirport)) {
          const isValid = await trigger(['transportType', 'transportPax']);
          if (!isValid) {
            return;
          }
        }
        // For non-Jeddah routes, transport is optional, so we can proceed
      } else {
        const isValid = await trigger(currentStepData.fields as any);
        if (!isValid) {
          return;
        }
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

  const addPassenger = () => {
    const currentPassengers = getValues('passengers') || [];
    const newPassenger: PassengerFormData = {
      isLeadPassenger: false,
      fullName: '',
      passportNumber: '',
      nationality: '',
      passportExpiry: '',
      dateOfBirth: '',
      gender: 'male',
      phoneNumber: ''
    };
    
    setValue('passengers', [...currentPassengers, newPassenger]);
    setValue('passengerCount', currentPassengers.length + 1);
  };

  const removePassenger = (index: number) => {
    const currentPassengers = getValues('passengers') || [];
    if (currentPassengers.length > 1) {
      const updatedPassengers = currentPassengers.filter((_, i) => i !== index);
      setValue('passengers', updatedPassengers);
      setValue('passengerCount', updatedPassengers.length);
    }
  };

  const updatePassengerCount = (count: number) => {
    const currentPassengers = getValues('passengers') || [];
    const accommodationType = getValues('accommodationType');
    
    if (!validatePassengerCount(count, accommodationType)) {
      toast.error(`Maximum ${accommodationType === 'iqama' ? VALIDATION_RULES.MAX_PASSENGERS_IQAMA : VALIDATION_RULES.MAX_PASSENGERS} passengers allowed`);
      return;
    }
    
    setValue('passengerCount', count);
    
    // Adjust passengers array
    if (count > currentPassengers.length) {
      // Add new passengers
      const newPassengers = Array.from({ length: count - currentPassengers.length }, (_, i) => ({
        isLeadPassenger: false,
        fullName: '',
        passportNumber: '',
        nationality: '',
        passportExpiry: '',
        dateOfBirth: '',
        gender: 'male' as const,
        phoneNumber: ''
      }));
      setValue('passengers', [...currentPassengers, ...newPassengers]);
    } else if (count < currentPassengers.length) {
      // Remove passengers
      const updatedPassengers = currentPassengers.slice(0, count);
      setValue('passengers', updatedPassengers);
    }
  };

  const loadTransportOptions = async (route: string) => {
    try {
      const response = await transportMasterAPI.getByRoute(route);
      setTransportOptions(response.data.transportMasters);
    } catch (error) {
      console.error('Error loading transport options:', error);
      setTransportOptions([]);
    }
  };

  const calculateTransportPrice = async (route: string, transportType: string, pax: number) => {
    try {
      const response = await transportMasterAPI.getPricing(route, transportType, pax);
      setTransportPrice(response.data.price);
    } catch (error) {
      console.error('Error calculating transport price:', error);
      setTransportPrice(null);
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>, passengerId: string, documentType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and PDF files are allowed');
      return;
    }

    // Update documents state
    setDocuments(prev => ({
      ...prev,
      [passengerId]: [
        ...(prev[passengerId] || []).filter(d => !d.name.includes(documentType)),
        { ...file, name: `${documentType}_${file.name}` }
      ]
    }));

    toast.success(`${documentType.replace('_', ' ')} uploaded successfully`);
  };

  const onSubmit = async (data: UmrahVisaBookingFormData) => {
    if (!partyId) {
      toast.error('Party information not found');
      return;
    }

    setIsLoading(true);

    try {
      // Transform data for API
      const bookingData: CreateUmrahVisaBookingRequest = {
        party_id: partyId,
        booking_mode: data.bookingMode,
        group_number: data.groupNumber,
        group_name: data.groupName,
        flight_number: data.flightNumber,
        arrival_date: data.arrivalDate,
        departure_date: data.departureDate,
        arrival_airport: data.arrivalAirport,
        transport_route: data.arrivalAirport,
        transport_type: transportOptions.find(option => option.id === data.transportType)?.vehicleType || data.transportType,
        transport_pax: data.transportPax,
        accommodation_type: data.accommodationType,
        makkah_checkin: data.makkahCheckIn,
        makkah_checkout: data.makkahCheckOut,
        madina_checkin: data.madinaCheckIn,
        madina_checkout: data.madinaCheckOut,
        iqama_number: data.iqamaNumber,
        iqama_name: data.iqamaName,
        iqama_dob: data.iqamaDob,
        iqama_mobile: data.iqamaMobile,
        passenger_count: data.passengerCount,
        passengers: data.passengers.map(p => ({
          is_lead_passenger: p.isLeadPassenger,
          full_name: p.fullName,
          passport_number: p.passportNumber,
          nationality: p.nationality,
          passport_expiry: p.passportExpiry,
          date_of_birth: p.dateOfBirth,
          gender: p.gender,
          phone_number: p.phoneNumber
        }))
      };

      // Create booking
      const response = await umrahVisaAPI.createBooking(bookingData);
      const booking = response.data.booking;

      // Show success message immediately
      toast.success('Umrah visa booking submitted successfully!');

      // Navigate to dashboard immediately
      router.push('/party/dashboard');

      // Upload documents in background (non-blocking)
      setTimeout(async () => {
        try {
          const uploadPromises = [];
          for (let i = 0; i < booking.passengers.length; i++) {
            const passenger = booking.passengers[i];
            const passengerDocs = documents[`passenger-${i}`];
            
            if (passengerDocs && passengerDocs.length > 0) {
              const documentTypes = passenger.isLeadPassenger 
                ? ['pan_card', 'passport_front', 'passport_back']
                : ['passport_front', 'passport_back'];
              
              uploadPromises.push(
                uploadAPI.uploadPassengerDocuments(
                  booking.id, 
                  passenger.id, 
                  passengerDocs, 
                  documentTypes
                ).catch(uploadError => {
                  console.error(`Failed to upload documents for ${passenger.fullName}:`, uploadError);
                  return { passenger: passenger.fullName, error: uploadError };
                })
              );
            }
          }

          if (uploadPromises.length > 0) {
            const uploadResults = await Promise.allSettled(uploadPromises);
            const failedUploads = uploadResults
              .filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && result.value?.error))
              .map(result => result.status === 'fulfilled' ? result.value.passenger : 'Unknown passenger');
            
            if (failedUploads.length > 0) {
              console.warn(`Failed to upload documents for: ${failedUploads.join(', ')}`);
            }
          }
        } catch (error) {
          console.error('Background document upload failed:', error);
        }
      }, 1000); // Wait 1 second before starting background uploads
    } catch (error: any) {
      console.error('Booking submission error:', error);
      
      // Check if it's actually a success but being treated as error
      if (error.response?.status === 201) {
        toast.success('Umrah visa booking submitted successfully!');
        router.push('/party/dashboard');
      } else if (error.response?.status === 409) {
        // Handle conflict errors with detailed messages
        const errorData = error.response.data;
        if (errorData.conflicts && Array.isArray(errorData.conflicts)) {
          const conflictMessages = errorData.conflicts.map((conflict: any) => conflict.message).join(', ');
          toast.error(`Booking conflict: ${conflictMessages}`);
        } else {
          toast.error(errorData.error || 'Booking conflict detected');
        }
      } else {
        toast.error(error.response?.data?.error || error.message || 'Failed to submit booking');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    const bookingMode = watch('bookingMode');
    const arrivalAirport = watch('arrivalAirport');
    const accommodationType = watch('accommodationType');
    const transportRoute = watch('transportRoute');
    const transportType = watch('transportType');
    const transportPax = watch('transportPax');
    const passengers = watch('passengers') || [];

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">Select Booking Mode *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    bookingMode === 'group_number' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setValue('bookingMode', 'group_number')}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      bookingMode === 'group_number' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`} />
                    <div>
                      <h3 className="font-medium">Group Number</h3>
                      <p className="text-sm text-gray-500">Book with existing group number</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    bookingMode === 'travel_documents' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setValue('bookingMode', 'travel_documents')}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      bookingMode === 'travel_documents' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`} />
                    <div>
                      <h3 className="font-medium">Travel Documents</h3>
                      <p className="text-sm text-gray-500">Book with travel documents</p>
                    </div>
                  </div>
                </div>
              </div>
              {errors.bookingMode && (
                <p className="text-sm text-red-600">{errors.bookingMode.message}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookingMode === 'group_number' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="groupNumber">Group Number *</Label>
                    <Input
                      id="groupNumber"
                      placeholder="Enter group number"
                      {...register('groupNumber')}
                      disabled={isLoading}
                    />
                    {errors.groupNumber && (
                      <p className="text-sm text-red-600">{errors.groupNumber.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="groupName">Group Name *</Label>
                    <Input
                      id="groupName"
                      placeholder="Enter group name"
                      {...register('groupName')}
                      disabled={isLoading}
                    />
                    {errors.groupName && (
                      <p className="text-sm text-red-600">{errors.groupName.message}</p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="flightNumber">Flight Number *</Label>
                <Input
                  id="flightNumber"
                  placeholder="e.g., SV1234"
                  {...register('flightNumber')}
                  disabled={isLoading}
                />
                {errors.flightNumber && (
                  <p className="text-sm text-red-600">{errors.flightNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="arrivalDate">Arrival Date *</Label>
                <Input
                  id="arrivalDate"
                  type="date"
                  {...register('arrivalDate')}
                  disabled={isLoading}
                />
                {errors.arrivalDate && (
                  <p className="text-sm text-red-600">{errors.arrivalDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="departureDate">Departure Date *</Label>
                <Input
                  id="departureDate"
                  type="date"
                  {...register('departureDate')}
                  disabled={isLoading}
                />
                {errors.departureDate && (
                  <p className="text-sm text-red-600">{errors.departureDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="arrivalAirport">Arrival Airport/Route *</Label>
                <Select 
                  value={watch('arrivalAirport')} 
                  onValueChange={(value) => setValue('arrivalAirport', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select arrival airport/route" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTE_OPTIONS.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.arrivalAirport && (
                  <p className="text-sm text-red-600">{errors.arrivalAirport.message}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        const isJeddahRouteSelected = arrivalAirport && isJeddahRoute(arrivalAirport);
        
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  Transport Details {isJeddahRouteSelected ? '*' : '(Optional)'}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/transport-pricing.pdf', '_blank')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Pricing Brochure
                </Button>
              </div>
              
              {!isJeddahRouteSelected && (
                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  Transport is optional for this route. You can skip this step or provide transport details if needed.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transportRoute">Transport Route</Label>
                <Input
                  id="transportRoute"
                  value={arrivalAirport}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">Auto-filled based on arrival airport</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transportType">
                  Transport Option {isJeddahRouteSelected ? '*' : ''}
                </Label>
                <Select 
                  value={watch('transportType')} 
                  onValueChange={(value) => {
                    setValue('transportType', value);
                    // Find the selected transport option and set PAX and price
                    const selectedOption = transportOptions.find(option => option.id === value);
                    if (selectedOption) {
                      setValue('transportPax', selectedOption.pax);
                      setTransportPrice(selectedOption.price);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select transport option" />
                  </SelectTrigger>
                  <SelectContent>
                    {transportOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{option.vehicleType}</span>
                          <span className="text-xs text-gray-500">
                            {option.pax} PAX - SAR {option.price}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.transportType && (
                  <p className="text-sm text-red-600">{errors.transportType.message}</p>
                )}
              </div>

              {transportPrice && transportPax && (
                <div className="space-y-2">
                  <Label>Transport Price</Label>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-lg font-semibold text-green-800">
                      SAR {transportPrice}
                    </p>
                    <p className="text-sm text-green-600">
                      Price for {transportPax} passengers
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">Select Accommodation Type *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    accommodationType === 'hotel' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setValue('accommodationType', 'hotel')}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      accommodationType === 'hotel' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`} />
                    <div>
                      <h3 className="font-medium">Hotel Details</h3>
                      <p className="text-sm text-gray-500">Provide hotel check-in/check-out dates</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    accommodationType === 'iqama' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setValue('accommodationType', 'iqama')}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      accommodationType === 'iqama' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`} />
                    <div>
                      <h3 className="font-medium">Iqama Details</h3>
                      <p className="text-sm text-gray-500">Provide sponsor iqama information</p>
                    </div>
                  </div>
                </div>
              </div>
              {errors.accommodationType && (
                <p className="text-sm text-red-600">{errors.accommodationType.message}</p>
              )}
            </div>

            {accommodationType === 'hotel' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="makkahCheckIn">Makkah Check-in Date *</Label>
                  <Input
                    id="makkahCheckIn"
                    type="date"
                    {...register('makkahCheckIn')}
                    disabled={isLoading}
                  />
                  {errors.makkahCheckIn && (
                    <p className="text-sm text-red-600">{errors.makkahCheckIn.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="makkahCheckOut">Makkah Check-out Date *</Label>
                  <Input
                    id="makkahCheckOut"
                    type="date"
                    {...register('makkahCheckOut')}
                    disabled={isLoading}
                  />
                  {errors.makkahCheckOut && (
                    <p className="text-sm text-red-600">{errors.makkahCheckOut.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="madinaCheckIn">Madina Check-in Date *</Label>
                  <Input
                    id="madinaCheckIn"
                    type="date"
                    {...register('madinaCheckIn')}
                    disabled={isLoading}
                  />
                  {errors.madinaCheckIn && (
                    <p className="text-sm text-red-600">{errors.madinaCheckIn.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="madinaCheckOut">Madina Check-out Date *</Label>
                  <Input
                    id="madinaCheckOut"
                    type="date"
                    {...register('madinaCheckOut')}
                    disabled={isLoading}
                  />
                  {errors.madinaCheckOut && (
                    <p className="text-sm text-red-600">{errors.madinaCheckOut.message}</p>
                  )}
                </div>
              </div>
            )}

            {accommodationType === 'iqama' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="iqamaNumber">Iqama Number *</Label>
                  <Input
                    id="iqamaNumber"
                    placeholder="Enter iqama number"
                    {...register('iqamaNumber')}
                    disabled={isLoading}
                  />
                  {errors.iqamaNumber && (
                    <p className="text-sm text-red-600">{errors.iqamaNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iqamaName">Iqama Name *</Label>
                  <Input
                    id="iqamaName"
                    placeholder="Enter iqama holder name"
                    {...register('iqamaName')}
                    disabled={isLoading}
                  />
                  {errors.iqamaName && (
                    <p className="text-sm text-red-600">{errors.iqamaName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iqamaDob">Date of Birth *</Label>
                  <Input
                    id="iqamaDob"
                    type="date"
                    {...register('iqamaDob')}
                    disabled={isLoading}
                  />
                  {errors.iqamaDob && (
                    <p className="text-sm text-red-600">{errors.iqamaDob.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iqamaMobile">Mobile Number *</Label>
                  <Input
                    id="iqamaMobile"
                    type="tel"
                    placeholder="+966 123456789"
                    {...register('iqamaMobile')}
                    disabled={isLoading}
                  />
                  {errors.iqamaMobile && (
                    <p className="text-sm text-red-600">{errors.iqamaMobile.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Passenger Count *</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updatePassengerCount(Math.max(1, watch('passengerCount') - 1))}
                    disabled={watch('passengerCount') <= 1}
                  >
                    -
                  </Button>
                  <span className="w-12 text-center font-medium">{watch('passengerCount')}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updatePassengerCount(watch('passengerCount') + 1)}
                    disabled={watch('passengerCount') >= (accommodationType === 'iqama' ? VALIDATION_RULES.MAX_PASSENGERS_IQAMA : VALIDATION_RULES.MAX_PASSENGERS)}
                  >
                    +
                  </Button>
                </div>
              </div>
              
              {accommodationType === 'iqama' && (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  Maximum {VALIDATION_RULES.MAX_PASSENGERS_IQAMA} passengers allowed for iqama accommodation
                </p>
              )}
            </div>

            <div className="space-y-6">
              {passengers.map((passenger, index) => (
                <Card key={index} className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">
                      Passenger {index + 1} {passenger.isLeadPassenger && '(Lead Passenger)'}
                    </h3>
                    {index === 0 && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`lead-${index}`}
                          checked={passenger.isLeadPassenger}
                          onChange={(e) => {
                            const updatedPassengers = [...passengers];
                            updatedPassengers[index].isLeadPassenger = e.target.checked;
                            setValue('passengers', updatedPassengers);
                          }}
                          className="rounded"
                        />
                        <Label htmlFor={`lead-${index}`} className="text-sm">
                          Lead Passenger
                        </Label>
                      </div>
                    )}
                  </div>

                  {/* Passenger Details */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Personal Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`passenger-${index}-fullName`}>Full Name *</Label>
                          <Input
                            id={`passenger-${index}-fullName`}
                            placeholder="As per passport"
                            {...register(`passengers.${index}.fullName`)}
                            disabled={isLoading}
                          />
                          {errors.passengers?.[index]?.fullName && (
                            <p className="text-sm text-red-600">{errors.passengers[index]?.fullName?.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`passenger-${index}-passportNumber`}>Passport Number *</Label>
                          <Input
                            id={`passenger-${index}-passportNumber`}
                            placeholder="Passport number"
                            {...register(`passengers.${index}.passportNumber`)}
                            disabled={isLoading}
                          />
                          {errors.passengers?.[index]?.passportNumber && (
                            <p className="text-sm text-red-600">{errors.passengers[index]?.passportNumber?.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`passenger-${index}-nationality`}>Nationality *</Label>
                          <Input
                            id={`passenger-${index}-nationality`}
                            placeholder="e.g., Indian"
                            {...register(`passengers.${index}.nationality`)}
                            disabled={isLoading}
                          />
                          {errors.passengers?.[index]?.nationality && (
                            <p className="text-sm text-red-600">{errors.passengers[index]?.nationality?.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`passenger-${index}-passportExpiry`}>Passport Expiry *</Label>
                          <Input
                            id={`passenger-${index}-passportExpiry`}
                            type="date"
                            {...register(`passengers.${index}.passportExpiry`)}
                            disabled={isLoading}
                          />
                          {errors.passengers?.[index]?.passportExpiry && (
                            <p className="text-sm text-red-600">{errors.passengers[index]?.passportExpiry?.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`passenger-${index}-dateOfBirth`}>Date of Birth *</Label>
                          <Input
                            id={`passenger-${index}-dateOfBirth`}
                            type="date"
                            {...register(`passengers.${index}.dateOfBirth`)}
                            disabled={isLoading}
                          />
                          {errors.passengers?.[index]?.dateOfBirth && (
                            <p className="text-sm text-red-600">{errors.passengers[index]?.dateOfBirth?.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`passenger-${index}-gender`}>Gender *</Label>
                          <Select 
                            value={watch(`passengers.${index}.gender`)} 
                            onValueChange={(value: 'male' | 'female') => {
                              const updatedPassengers = [...passengers];
                              updatedPassengers[index].gender = value;
                              setValue('passengers', updatedPassengers);
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
                          {errors.passengers?.[index]?.gender && (
                            <p className="text-sm text-red-600">{errors.passengers[index]?.gender?.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`passenger-${index}-phoneNumber`}>Phone Number</Label>
                          <Input
                            id={`passenger-${index}-phoneNumber`}
                            type="tel"
                            placeholder="+91 1234567890"
                            {...register(`passengers.${index}.phoneNumber`)}
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Document Upload Section */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Required Documents</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* PAN Card - Only for Lead Passenger */}
                        {passenger.isLeadPassenger && (
                          <div className="space-y-2">
                            <Label htmlFor={`pan-${index}`}>PAN Card *</Label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                              <input
                                type="file"
                                id={`pan-${index}`}
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleDocumentUpload(e, `passenger-${index}`, 'pan_card')}
                                className="hidden"
                              />
                              <label
                                htmlFor={`pan-${index}`}
                                className="cursor-pointer flex flex-col items-center space-y-2"
                              >
                                <Upload className="h-8 w-8 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  {documents[`passenger-${index}`]?.find(d => d.name.includes('pan')) ? 
                                    'PAN Card uploaded' : 'Upload PAN Card'}
                                </span>
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Passport Front */}
                        <div className="space-y-2">
                          <Label htmlFor={`passport-front-${index}`}>Passport Front *</Label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                            <input
                              type="file"
                              id={`passport-front-${index}`}
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleDocumentUpload(e, `passenger-${index}`, 'passport_front')}
                              className="hidden"
                            />
                            <label
                              htmlFor={`passport-front-${index}`}
                              className="cursor-pointer flex flex-col items-center space-y-2"
                            >
                              <Upload className="h-8 w-8 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {documents[`passenger-${index}`]?.find(d => d.name.includes('passport_front')) ? 
                                  'Passport Front uploaded' : 'Upload Passport Front'}
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Passport Back */}
                        <div className="space-y-2">
                          <Label htmlFor={`passport-back-${index}`}>Passport Back *</Label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                            <input
                              type="file"
                              id={`passport-back-${index}`}
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleDocumentUpload(e, `passenger-${index}`, 'passport_back')}
                              className="hidden"
                            />
                            <label
                              htmlFor={`passport-back-${index}`}
                              className="cursor-pointer flex flex-col items-center space-y-2"
                            >
                              <Upload className="h-8 w-8 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {documents[`passenger-${index}`]?.find(d => d.name.includes('passport_back')) ? 
                                  'Passport Back uploaded' : 'Upload Passport Back'}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );


      default:
        return null;
    }
  };

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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

