'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUser, hasRole } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { ChevronRight, ChevronLeft, Menu, User } from 'lucide-react';
import { partyAPI } from '@/lib/api';

// Import our new components and hooks
import { useUmrahBooking, useMasterData } from '@/hooks/useUmrahBooking';
import { StepProgress, LoadingSpinner } from '@/components/umrah-booking/shared';
import { BookingModeStep } from '@/components/umrah-booking/steps/BookingModeStep';
import { TravelDetailsStep } from '@/components/umrah-booking/steps/TravelDetailsStep';
import { AccommodationStep } from '@/components/umrah-booking/steps/AccommodationStep';
import { TransportVehicleSelectionStep } from '@/components/umrah-booking/steps/TransportVehicleSelectionStep';
import { DocumentsStep } from '@/components/umrah-booking/steps/DocumentsStep';
import { validateStep1, validateStep2, validateStep3, validateStep4, validateStep5 } from '@/lib/umrah/validation';

interface Party {
  id: string;
  partyName: string;
  email: string;
}

export default function AdminCreateIndividualUmrahVisaPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [loadingParties, setLoadingParties] = useState(true);
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    
    if (!currentUser || !hasRole(['admin', 'staff'])) {
      router.push('/');
      return;
    }

    loadParties();
    loadInitialData();
  }, [router, loadInitialData]);

  useEffect(() => {
    if (selectedPartyId) {
      loadPartyData(selectedPartyId);
    }
  }, [selectedPartyId, loadPartyData]);

  const loadParties = async () => {
    try {
      setLoadingParties(true);
      const response = await partyAPI.getAll({ is_customer: 'true', page: '1', limit: '1000' });
      const partiesData = response.data.parties || [];
      setParties(partiesData);
    } catch (error) {
      console.error('Error loading parties:', error);
      toast.error('Failed to load parties');
    } finally {
      setLoadingParties(false);
    }
  };

  const validateCurrentStep = () => {
    switch (bookingState.currentStep) {
      case 1:
        return validateStep1(bookingState.step1Data);
      case 2:
        return validateStep2(bookingState.step2Data, masterData.airports, bookingState.step1Data);
      case 3:
        return validateStep3(bookingState.step3Data, bookingState.step2Data.arrivalDate, bookingState.step2Data.departureDate, bookingState.step2Data);
      case 4:
        return validateStep4(bookingState.step4Data, bookingState.step1Data, bookingState.step2Data, bookingState.step3Data, masterData.locationMasters);
      case 5:
        return validateStep5(bookingState.step5Data, bookingState.step1Data, bookingState.step3Data, false);
      default:
        return null;
    }
  };

  const nextStep = async () => {
    if (!selectedPartyId) {
      toast.error('Please select a party first');
      return;
    }

    const validationError = validateCurrentStep();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const success = await submitStep(bookingState.currentStep);
    if (success && bookingState.currentStep === 5) {
      router.push('/dashboard/umrah-visa/bookings');
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
            onChange={updateStep4Data}
            disabled={isLoading}
          />
        );

      case 5:
        return (
          <DocumentsStep
            data={bookingState.step5Data}
            step1Data={bookingState.step1Data}
            step3Data={bookingState.step3Data}
            onChange={updateStep5Data}
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
    <div className="flex h-screen bg-gray-50/50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header Bar */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Create Individual Umrah Visa</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Complete the steps below to create an Umrah visa booking on behalf of a party
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-8 pb-24">
          {!selectedPartyId ? (
            /* Party Selection Screen - Show first */
            <div className="max-w-2xl mx-auto mt-12">
              <Card className="shadow-lg">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Select Party</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Choose the party for which you are creating this Umrah visa booking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="partyId" className="text-base">Party *</Label>
                    {loadingParties ? (
                      <div className="text-sm text-gray-500 py-4 text-center">Loading parties...</div>
                    ) : (
                      <Select
                        value={selectedPartyId}
                        onValueChange={(value) => {
                          setSelectedPartyId(value);
                          // Reset booking state when party changes
                          setCurrentStep(1);
                        }}
                        required
                      >
                        <SelectTrigger className="h-12 text-base">
                          <SelectValue placeholder="Select a party" />
                        </SelectTrigger>
                        <SelectContent>
                          {parties.map((party) => (
                            <SelectItem key={party.id} value={party.id}>
                              {party.partyName} ({party.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {selectedPartyId && (
                    <div className="pt-4 flex justify-end">
                      <Button
                        onClick={() => {
                          if (selectedPartyId) {
                            loadPartyData(selectedPartyId);
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Continue to Booking
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Booking Flow - Show after party selection */
            <>
              <div className="w-full">
                {/* Step Progress */}
                <StepProgress
                  currentStep={bookingState.currentStep}
                  completedSteps={bookingState.completedSteps}
                  onStepClick={goToStep}
                />

                {/* Step Content */}
                <div className="mb-8 mt-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-indigo-100 to-indigo-200 flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold">{bookingState.currentStep}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Step {bookingState.currentStep}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {bookingState.currentStep === 1 && 'Choose your booking type'}
                          {bookingState.currentStep === 2 && 'Enter travel details and flight information'}
                          {bookingState.currentStep === 3 && 'Select accommodation type and details'}
                          {bookingState.currentStep === 4 && 'Select transport vehicle (optional)'}
                          {bookingState.currentStep === 5 && 'Upload required documents'}
                        </p>
                      </div>
                    </div>
                    {renderStepContent()}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Fixed Navigation Buttons Footer */}
        {selectedPartyId && (
          <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-lg z-10">
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
                  onClick={() => router.push('/dashboard/umrah-visa/bookings')}
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
                  disabled={isLoading || !selectedPartyId}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isLoading ? 'Processing...' : bookingState.currentStep < 5 ? 'Next' : 'Submit Application'}
                  {bookingState.currentStep < 5 && <ChevronRight className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

