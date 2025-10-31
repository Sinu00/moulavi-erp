'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getUser, hasRole, removeUser } from '@/lib/auth';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { ArrowLeft, ChevronRight, ChevronLeft } from 'lucide-react';

// Import our new components and hooks
import { useUmrahBooking, useMasterData } from '@/hooks/useUmrahBooking';
import { StepProgress, LoadingSpinner } from '@/components/umrah-booking/shared';
import { BookingModeStep } from '@/components/umrah-booking/steps/BookingModeStep';
import { TravelDetailsStep } from '@/components/umrah-booking/steps/TravelDetailsStep';
import { AccommodationStep } from '@/components/umrah-booking/steps/AccommodationStep';
import { DocumentsStep } from '@/components/umrah-booking/steps/DocumentsStep';
import { validateStep1, validateStep2, validateStep3, validateStep4 } from '@/lib/umrah/validation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function UmrahVisaNewPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  // Use our custom hooks
  const {
    bookingState,
    isLoading,
    partyId,
    updateStep1Data,
    updateStep2Data,
    updateStep3Data,
    updateStep4Data,
    setCurrentStep,
    loadPartyData,
    submitStep,
  } = useUmrahBooking();

  const {
    masterData,
    loadInitialData,
    loadTransportOptions,
    loadHotels,
    getHotelsForLocation,
  } = useMasterData();

  useEffect(() => {
    setIsClient(true);
    
    const currentUser = getUser();
    setUser(currentUser);
    
    if (!currentUser || !hasRole('party')) {
      router.push('/');
      return;
    }

    loadPartyData();
    loadInitialData();
  }, [router, loadPartyData, loadInitialData]);


  const validateCurrentStep = () => {
    switch (bookingState.currentStep) {
      case 1:
        return validateStep1(bookingState.step1Data);
      case 2:
        return validateStep2(bookingState.step2Data, masterData.airports);
      case 3:
        return validateStep3(bookingState.step3Data, bookingState.step2Data.arrivalDate, bookingState.step2Data.departureDate);
      case 4:
        return validateStep4(bookingState.step4Data, bookingState.step1Data, bookingState.step3Data);
      default:
        return null;
    }
  };

  const nextStep = async () => {
    const validationError = validateCurrentStep();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const success = await submitStep(bookingState.currentStep);
    if (success && bookingState.currentStep === 4) {
      router.push('/party/dashboard');
    }
  };

  const prevStep = () => {
    setCurrentStep(Math.max(bookingState.currentStep - 1, 1));
  };

  const goToStep = (stepId: number) => {
    if (stepId <= bookingState.currentStep || bookingState.completedSteps.includes(stepId)) {
      setCurrentStep(stepId);
    }
  };

  const renderStepContent = () => {
    switch (bookingState.currentStep) {
      case 1:
        return (
          <BookingModeStep
            data={bookingState.step1Data}
            onChange={updateStep1Data}
            disabled={isLoading}
          />
        );

      case 2:
        return (
          <TravelDetailsStep
            data={bookingState.step2Data}
            onChange={updateStep2Data}
            airports={masterData.airports}
            transportOptions={masterData.transportOptions}
            onLoadTransportOptions={loadTransportOptions}
            disabled={isLoading}
          />
        );

      case 3:
        return (
          <AccommodationStep
            data={bookingState.step3Data}
            onChange={updateStep3Data}
            locations={masterData.locations}
            hotels={masterData.hotels}
            arrivalDate={bookingState.step2Data.arrivalDate}
            departureDate={bookingState.step2Data.departureDate}
            onLoadHotels={loadHotels}
            getHotelsForLocation={getHotelsForLocation}
            disabled={isLoading}
          />
        );

      case 4:
        return (
          <DocumentsStep
            data={bookingState.step4Data}
            step1Data={bookingState.step1Data}
            step3Data={bookingState.step3Data}
            onChange={updateStep4Data}
            disabled={isLoading}
          />
        );

      default:
        return null;
    }
  };

  if (!isClient) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return (
    <PartyLayout 
      title="Umrah Visa Application" 
      subtitle="Complete the steps below to apply for your Umrah visa"
    >
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-sm border border-gray-100">
            <CardContent className="p-6">
              {/* Step Progress */}
              <StepProgress
                currentStep={bookingState.currentStep}
                completedSteps={bookingState.completedSteps}
                onStepClick={goToStep}
              />

              {/* Step Content */}
              <div className="mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-red-100 to-red-200 flex items-center justify-center">
                      <ArrowLeft className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Step {bookingState.currentStep}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {bookingState.currentStep === 1 && 'Choose your booking type'}
                        {bookingState.currentStep === 2 && 'Enter travel details and flight information'}
                        {bookingState.currentStep === 3 && 'Select accommodation type and details'}
                        {bookingState.currentStep === 4 && 'Upload required documents'}
                      </p>
                    </div>
                  </div>
                  {renderStepContent()}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t border-gray-200">
                <div className="flex space-x-3">
                  {bookingState.currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      disabled={isLoading}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
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
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isLoading ? 'Processing...' : bookingState.currentStep < 4 ? 'Next' : 'Submit Application'}
                    {bookingState.currentStep < 4 && <ChevronRight className="h-4 w-4 ml-2" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PartyLayout>
  );
}