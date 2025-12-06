'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getUser, hasRole, removeUser } from '@/lib/auth';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { ArrowLeft, ChevronRight, ChevronLeft } from 'lucide-react';

// Import our new components and hooks
import { useUmrahBooking, useMasterData } from '@/hooks/useUmrahBooking';
import { StepProgress, LoadingSpinner } from '@/components/umrah-booking/shared';
import { INDIVIDUAL_STEPS } from '@/lib/umrah/constants';
import { BookingModeStep } from '@/components/umrah-booking/steps/BookingModeStep';
import { TravelDetailsStep } from '@/components/umrah-booking/steps/TravelDetailsStep';
import { AccommodationStep } from '@/components/umrah-booking/steps/AccommodationStep';
import { TransportVehicleSelectionStep } from '@/components/umrah-booking/steps/TransportVehicleSelectionStep';
import { MovementDetailsStep } from '@/components/umrah-booking/steps/MovementDetailsStep';
import { DocumentsStep } from '@/components/umrah-booking/steps/DocumentsStep';
import { validateStep1, validateStep2, validateStep3, validateStep4, validateStep5Movements, validateStep6 } from '@/lib/umrah/validation';

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
    updateStep5Data,
    updateStep6Data,
    setCurrentStep,
    loadPartyData,
    submitStep,
  } = useUmrahBooking();

  const {
    masterData,
    loadInitialData,
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
        return validateStep2(bookingState.step2Data, masterData.airports, bookingState.step1Data, masterData.umrahVisaMaster);
      case 3:
        return validateStep3(bookingState.step3Data, bookingState.step2Data.arrivalDate, bookingState.step2Data.departureDate, bookingState.step2Data);
      case 4:
        return validateStep4(bookingState.step4Data, bookingState.step2Data.arrivalDate, bookingState.step2Data.departureDate);
      case 5:
        return validateStep5Movements(bookingState.step5Data, bookingState.step1Data, bookingState.step2Data, bookingState.step3Data, bookingState.step4Data, masterData.locationMasters);
      case 6:
        return validateStep6(bookingState.step6Data || { panCardZipFile: null }, bookingState.step1Data, bookingState.step3Data, false);
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
    
    // Special handling for step 3: Skip steps 4 and 5 if arrival airport is not Jeddah/Madinah
    if (success && bookingState.currentStep === 3 && !isJeddahOrMadinahAirport()) {
      // Skip steps 4 and 5, go directly to step 6
      setCurrentStep(6);
      return;
    }
    
    if (success && bookingState.currentStep === 6) {
      router.push('/party/dashboard');
    }
  };

  // Helper: Check if arrival airport is Jeddah or Madinah
  const isJeddahOrMadinahAirport = (): boolean => {
    if (!bookingState.step2Data.arrivalAirportId || !masterData.locationMasters) {
      return false;
    }
    const arrivalAirport = masterData.locationMasters.find(
      (lm) => lm.id === bookingState.step2Data.arrivalAirportId && lm.locationType === 'AIRPORT'
    );
    if (!arrivalAirport) return false;
    
    const cityName = arrivalAirport.cityMaster?.name || arrivalAirport.city || '';
    const normalizedCity = cityName.toLowerCase().trim();
    return normalizedCity === 'jeddah' || normalizedCity === 'madinah' || normalizedCity === 'madina' || normalizedCity === 'medina';
  };

  const prevStep = () => {
    // Special handling for step 6:
    // - If arrival airport is not Jeddah/Madinah, go to step 3
    // - If no transport is selected, go to step 3 (not step 5)
    if (bookingState.currentStep === 6) {
      if (!isJeddahOrMadinahAirport()) {
        setCurrentStep(3);
        return;
      }
      // Check if transport is selected
      const hasTransport = bookingState.step4Data.selectedTransport || 
                           (bookingState.step4Data.selectedTransports && bookingState.step4Data.selectedTransports.length > 0);
      if (!hasTransport) {
        setCurrentStep(3);
        return;
      }
    }
    setCurrentStep(Math.max(bookingState.currentStep - 1, 1));
  };

  const goToStep = (stepId: number) => {
    // Prevent going to steps 4 or 5 if arrival airport is not Jeddah/Madinah
    if ((stepId === 4 || stepId === 5) && !isJeddahOrMadinahAirport()) {
      // If trying to go to step 4 or 5 but airport is not Jeddah/Madinah, go to step 6 instead
      if (stepId === 4 || stepId === 5) {
        setCurrentStep(6);
        return;
      }
    }
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
            passengerCount={bookingState.step2Data.passengerCount}
            disabled={isLoading}
          />
        );

      case 4:
        return (
          <TransportVehicleSelectionStep
            data={bookingState.step4Data}
            step1Data={bookingState.step1Data}
            step2Data={bookingState.step2Data}
            step3Data={bookingState.step3Data}
            locationMasters={masterData.locationMasters}
            onChange={(data) => {
              updateStep4Data(data);
              // Clear movements if transport is removed
              const hasTransport = data.selectedTransport || 
                                   (data.selectedTransports && data.selectedTransports.length > 0);
              if (!hasTransport) {
                updateStep5Data({ movements: [] });
              }
            }}
            disabled={isLoading}
          />
        );

      case 5:
        return (
          <MovementDetailsStep
            data={bookingState.step5Data}
            step1Data={bookingState.step1Data}
            step2Data={bookingState.step2Data}
            step3Data={bookingState.step3Data}
            step4Data={bookingState.step4Data}
            locationMasters={masterData.locationMasters}
            arrivalAirportId={bookingState.step2Data.arrivalAirportId}
            departureAirportId={bookingState.step2Data.departureAirportId}
            arrivalDate={bookingState.step2Data.arrivalDate}
            departureDate={bookingState.step2Data.departureDate}
            arrivalTime={bookingState.step2Data.arrivalTime}
            departureTime={bookingState.step2Data.departureTime}
            onChange={updateStep5Data}
            disabled={isLoading}
          />
        );

      case 6:
        return (
          <DocumentsStep
            data={bookingState.step6Data || { panCardZipFile: null }}
            step1Data={bookingState.step1Data}
            step3Data={bookingState.step3Data}
            onChange={updateStep6Data}
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
      <div className="p-4 lg:p-6 pb-24 lg:pb-6">
        <div className="w-full">
          {/* Step Progress */}
          <StepProgress
            currentStep={bookingState.currentStep}
            completedSteps={bookingState.completedSteps}
            onStepClick={goToStep}
            steps={[...INDIVIDUAL_STEPS]}
          />

          {/* Step Content */}
          <div className="mb-6 lg:mb-8 mt-4 lg:mt-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4 lg:p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4 lg:mb-6">
                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-lg bg-gradient-to-r from-red-100 to-red-200 flex items-center justify-center flex-shrink-0">
                  <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900">
                    Step {bookingState.currentStep}
                  </h3>
                  <p className="text-xs lg:text-sm text-gray-600">
                    {bookingState.currentStep === 1 && 'Choose your booking type'}
                    {bookingState.currentStep === 2 && 'Enter travel details and flight information'}
                    {bookingState.currentStep === 3 && 'Select accommodation type and details'}
                    {bookingState.currentStep === 4 && 'Select transport vehicle (optional)'}
                    {bookingState.currentStep === 5 && 'Review and edit movement details'}
                    {bookingState.currentStep === 6 && 'Upload required documents'}
                  </p>
                </div>
              </div>
              {renderStepContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Navigation Buttons Footer */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t border-gray-200 px-3 lg:px-6 py-3 lg:py-4 shadow-lg z-10">
        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3">
            {bookingState.currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={isLoading}
                className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50"
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
              className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              onClick={nextStep}
              disabled={isLoading}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? 'Processing...' : bookingState.currentStep < 6 ? 'Next' : 'Submit Application'}
              {bookingState.currentStep < 6 && <ChevronRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </PartyLayout>
  );
}