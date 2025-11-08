'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getUser, hasRole, removeUser } from '@/lib/auth';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { ArrowLeft, ChevronRight, ChevronLeft, Plane, Users, Home, User } from 'lucide-react';

// Import our new components and hooks
import { useGroupUmrahBooking } from '@/hooks/useGroupUmrahBooking';
import { useMasterData } from '@/hooks/useUmrahBooking';
import { StepProgress, LoadingSpinner } from '@/components/umrah-booking/shared';
import { GroupDetailsStep } from '@/components/umrah-booking/steps/GroupDetailsStep';
import { TravelDetailsStep } from '@/components/umrah-booking/steps/TravelDetailsStep';
import { MovementDetailsStep } from '@/components/umrah-booking/steps/MovementDetailsStep';
import { GroupDocumentsStep } from '@/components/umrah-booking/steps/GroupDocumentsStep';
import { validateStep1, validateStep2, validateStep3, validateStep4 } from '@/lib/umrah/validation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function GroupUmrahVisaPage() {
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
    addPassenger,
    removePassenger,
    addHotelBooking,
    removeHotelBooking,
    hasStepDataChanged,
  } = useGroupUmrahBooking();

  const {
    masterData,
    loadInitialData,
    loadHotels,
    getHotelsForLocation,
  } = useMasterData();

  const steps = [
    {
      id: 1,
      title: 'Group Details',
      description: 'Group number and name',
      icon: 'Users',
    },
    {
      id: 2,
      title: 'Travel & Hotel Details',
      description: 'Flight and hotel information',
      icon: 'Plane',
    },
    {
      id: 3,
      title: 'Movement Details',
      description: 'Transportation and movement',
      icon: 'Home',
    },
    {
      id: 4,
      title: 'PAN Cards Upload',
      description: 'Upload ZIP file with PAN cards',
      icon: 'User',
    },
  ];

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
        return validateStep4(bookingState.step4Data, bookingState.step1Data, bookingState.step3Data, true); // true = isGroupVisa
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
          <GroupDetailsStep
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
            isGroupBooking={true}
            locations={masterData.locations}
            hotels={masterData.hotels}
            arrivalDate={bookingState.step2Data.arrivalDate}
            departureDate={bookingState.step2Data.departureDate}
            onLoadHotels={loadHotels}
            getHotelsForLocation={getHotelsForLocation}
            onAddHotelBooking={addHotelBooking}
            onRemoveHotelBooking={removeHotelBooking}
          />
        );

      case 3:
        // Find arrival airport in locationMasters to get cityId
        const arrivalAirport = masterData.locationMasters?.find(
          (lm) => lm.id === bookingState.step2Data.arrivalAirportId && lm.locationType === 'AIRPORT'
        );
        
        // Debug logging
        if (bookingState.step2Data.arrivalAirportId) {
          console.log('[GroupUmrahVisaPage] Step 3 - Debug Info:', {
            arrivalAirportId: bookingState.step2Data.arrivalAirportId,
            locationMastersCount: masterData.locationMasters?.length || 0,
            found: !!arrivalAirport,
            arrivalAirport: arrivalAirport,
            city: arrivalAirport?.city,
            cityMaster: arrivalAirport?.cityMaster,
            hotelBookingsCount: (bookingState.step2Data.hotelBookings || []).length,
          });
        }
        
        return (
          <MovementDetailsStep
            data={bookingState.step3Data}
            onChange={updateStep3Data}
            locations={masterData.locations}
            locationMasters={masterData.locationMasters}
            hotelBookings={bookingState.step2Data.hotelBookings || []}
            arrivalAirportId={bookingState.step2Data.arrivalAirportId}
            departureAirportId={bookingState.step2Data.departureAirportId}
            arrivalDate={bookingState.step2Data.arrivalDate}
            departureDate={bookingState.step2Data.departureDate}
            arrivalTime={bookingState.step2Data.arrivalTime}
            departureTime={bookingState.step2Data.departureTime}
            arrivalAirport={arrivalAirport}
            getAllHotelsForLocation={getHotelsForLocation}
            disabled={isLoading}
          />
        );

      case 4:
        return (
          <GroupDocumentsStep
            data={bookingState.step4Data}
            step1Data={bookingState.step1Data}
            step3Data={bookingState.step3Data}
            onChange={updateStep4Data}
            onStep1DataChange={updateStep1Data}
            onAddPassenger={addPassenger}
            onRemovePassenger={removePassenger}
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
      title="Group Umrah Visa Application" 
      subtitle="Complete the steps below to apply for your group Umrah visa"
    >
      <div className="p-6 pb-24">
        <div className="w-full">
          {/* Step Progress */}
          <StepProgress
            currentStep={bookingState.currentStep}
            completedSteps={bookingState.completedSteps}
            onStepClick={goToStep}
            steps={steps}
          />

          {/* Step Content */}
          <div className="mb-8 mt-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-red-100 to-red-200 flex items-center justify-center">
                  {(() => {
                    const map:any = { Users, Plane, Home, User };
                    const Icon = map[steps[bookingState.currentStep - 1].icon];
                    return <Icon className="h-5 w-5 text-red-600" />;
                  })()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {steps[bookingState.currentStep - 1].title}
                  </h3>
                  <p className="text-sm text-gray-600">{steps[bookingState.currentStep - 1].description}</p>
                </div>
              </div>
              {renderStepContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Navigation Buttons Footer */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-lg z-10">
        <div className="flex justify-between">
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
                  {/* Show indicator if step has unsaved changes (only for steps 1-3, not step 4) */}
                  {bookingState.currentStep < 4 && bookingState.completedSteps.includes(bookingState.currentStep) && hasStepDataChanged(bookingState.currentStep) && (
                    <div className="flex items-center text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      <span>•</span>
                      <span className="ml-1">Unsaved changes</span>
                    </div>
                  )}
                </div>
        </div>
      </div>
    </PartyLayout>
  );
}