'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getUser, hasRole, removeUser } from '@/lib/auth';
import { PartyLayout } from '@/components/layouts/PartyLayout';
import { ArrowLeft, ChevronRight, ChevronLeft, Plane, Users, Home, User, Truck } from 'lucide-react';

// Import our new components and hooks
import { useGroupUmrahBooking } from '@/hooks/useGroupUmrahBooking';
import { useMasterData } from '@/hooks/useUmrahBooking';
import { StepProgress, LoadingSpinner } from '@/components/umrah-booking/shared';
import { GroupDetailsStep } from '@/components/umrah-booking/steps/GroupDetailsStep';
import { TravelDetailsStep } from '@/components/umrah-booking/steps/TravelDetailsStep';
import { MovementDetailsStep } from '@/components/umrah-booking/steps/MovementDetailsStep';
import { TransportVehicleSelectionStep } from '@/components/umrah-booking/steps/TransportVehicleSelectionStep';
import { GroupDocumentsStep } from '@/components/umrah-booking/steps/GroupDocumentsStep';
import { validateStep1, validateStep2, validateStep3, validateStep4, validateStep5 } from '@/lib/umrah/validation';
import { umrahVisaAPI } from '@/lib/api';

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
    updateStep5Data,
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
      title: 'Transport Vehicle Selection',
      description: 'Select transport vehicle for your route',
      icon: 'Truck',
    },
    {
      id: 4,
      title: 'Movement Details',
      description: 'Transportation and movement',
      icon: 'Home',
    },
    {
      id: 5,
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


  const validateCurrentStep = async (): Promise<string | null> => {
    switch (bookingState.currentStep) {
      case 1:
        return validateStep1(bookingState.step1Data);
      case 2:
        return validateStep2(bookingState.step2Data, masterData.airports, bookingState.step1Data, masterData.umrahVisaMaster);
      case 3:
        return validateStep3(bookingState.step3Data, bookingState.step2Data.arrivalDate, bookingState.step2Data.departureDate, bookingState.step2Data, masterData.locationMasters);
      case 4:
        // Fetch ziyarath counts for validation
        const ziyarathMovements = bookingState.step4Data.movements?.filter(m => m.type === 'ziyarath' && m.date) || [];
        const ziyarathDates = ziyarathMovements.map(m => m.date!).filter((date, index, self) => self.indexOf(date) === index);
        
        let ziyarathCounts: { [date: string]: number } = {};
        if (ziyarathDates.length > 0) {
          try {
            const response = await umrahVisaAPI.getZiyarathCounts(
              ziyarathDates,
              bookingState.bookingId || undefined
            );
            ziyarathCounts = response.data || {};
          } catch (error) {
            console.error('Error fetching ziyarath counts for validation:', error);
            // Continue with validation even if counts fetch fails
          }
        }
        
        return validateStep4(
          bookingState.step4Data,
          bookingState.step2Data.arrivalDate,
          bookingState.step2Data.departureDate,
          ziyarathCounts
        );
      case 5:
        return validateStep5(bookingState.step5Data, bookingState.step1Data, bookingState.step3Data, true); // true = isGroupVisa
      default:
        return null;
    }
  };

  const nextStep = async () => {
    const validationError = await validateCurrentStep();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const success = await submitStep(bookingState.currentStep);
    if (success && bookingState.currentStep === 5) {
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
        return (
          <TransportVehicleSelectionStep
            data={bookingState.step3Data}
            step1Data={bookingState.step1Data}
            step2Data={bookingState.step2Data}
            locationMasters={masterData.locationMasters}
            onChange={updateStep3Data}
            disabled={isLoading}
          />
        );

      case 4:
        // Find arrival airport in locationMasters to get cityId
        const arrivalAirport = masterData.locationMasters?.find(
          (lm) => lm.id === bookingState.step2Data.arrivalAirportId && lm.locationType === 'AIRPORT'
        );
        
        return (
          <MovementDetailsStep
            data={bookingState.step4Data}
            onChange={updateStep4Data}
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
            step3Data={bookingState.step3Data}
            disabled={isLoading}
            bookingId={bookingState.bookingId}
          />
        );

      case 5:
        return (
          <GroupDocumentsStep
            data={bookingState.step5Data}
            step1Data={bookingState.step1Data}
            step3Data={bookingState.step3Data}
            onChange={updateStep5Data}
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
      <div className="p-4 lg:p-6 pb-24 lg:pb-6">
        <div className="w-full">
          {/* Step Progress */}
          <StepProgress
            currentStep={bookingState.currentStep}
            completedSteps={bookingState.completedSteps}
            onStepClick={goToStep}
            steps={steps}
          />

          {/* Step Content */}
          <div className="mb-6 lg:mb-8 mt-4 lg:mt-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4 lg:p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4 lg:mb-6">
                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-lg bg-gradient-to-r from-red-100 to-red-200 flex items-center justify-center flex-shrink-0">
                  {(() => {
                    const map:any = { Users, Plane, Home, Truck, User };
                    const Icon = map[steps[bookingState.currentStep - 1].icon];
                    return <Icon className="h-4 w-4 lg:h-5 lg:w-5 text-red-600" />;
                  })()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900">
                    {steps[bookingState.currentStep - 1].title}
                  </h3>
                  <p className="text-xs lg:text-sm text-gray-600">{steps[bookingState.currentStep - 1].description}</p>
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-3">
            <Button
              type="button"
              onClick={nextStep}
              disabled={isLoading}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? 'Processing...' : bookingState.currentStep < 5 ? 'Next' : 'Submit Application'}
              {bookingState.currentStep < 5 && <ChevronRight className="h-4 w-4 ml-2" />}
            </Button>
            {/* Show indicator if step has unsaved changes (only for steps 1-4, not step 5) */}
            {bookingState.currentStep < 5 && bookingState.completedSteps.includes(bookingState.currentStep) && hasStepDataChanged(bookingState.currentStep) && (
              <div className="flex items-center justify-center text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
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