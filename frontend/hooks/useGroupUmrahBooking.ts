import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { partyAPI } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/umrah/constants';
import { BookingState, MasterData, Step1Data, Step2Data, Step3Data, Step4Data } from '@/lib/umrah/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const useGroupUmrahBooking = () => {
  const [bookingState, setBookingState] = useState<BookingState>({
    currentStep: 1,
    completedSteps: [],
    bookingId: null,
    step1Data: {
      bookingMode: 'group_number',
      groupNumber: '',
      groupName: '',
    },
    step2Data: {
      arrivalDate: '',
      arrivalTime: '',
      arrivalAirportId: '',
      arrivalFlightNumber: '',
      departureDate: '',
      departureTime: '',
      departureAirportId: '',
      departureFlightNumber: '',
      transportBookings: [],
    },
    step3Data: {
      accommodationType: 'hotel', // Always hotel for group bookings
      hotelBookings: [],
      transportSegments: [],
      ziyarah: [],
    },
    step4Data: {
      passengers: [{
        fullName: '',
        isLeadPassenger: true,
        panCardPhoto: null,
        passportFront: null,
        passportBack: null,
        iqamaPhoto: null,
        hotelBooking: null,
        ticketCopy: null,
      }],
    },
    showDurationDialog: false,
    remainingDays: 0,
    uncoveredDates: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [stepDataHashes, setStepDataHashes] = useState<{[key: number]: string}>({});

  // Generate hash for step data to detect changes
  const generateStepDataHash = useCallback((stepNumber: number): string => {
    let dataToHash = '';
    switch (stepNumber) {
      case 1:
        dataToHash = JSON.stringify(bookingState.step1Data);
        break;
      case 2:
        dataToHash = JSON.stringify(bookingState.step2Data);
        break;
      case 3:
        dataToHash = JSON.stringify(bookingState.step3Data);
        break;
      case 4:
        dataToHash = JSON.stringify(bookingState.step4Data);
        break;
    }
    return btoa(dataToHash).slice(0, 16);
  }, [bookingState]);

  // Check if step data has changed since last submission
  const hasStepDataChanged = useCallback((stepNumber: number): boolean => {
    const currentHash = generateStepDataHash(stepNumber);
    const lastHash = stepDataHashes[stepNumber];
    return currentHash !== lastHash;
  }, [generateStepDataHash, stepDataHashes]);

  const loadPartyData = useCallback(async () => {
    try {
      const response = await partyAPI.getMyParty();
      const userParty = response.data.party;
      
      if (userParty) {
        setPartyId(userParty.id);
      } else {
        toast.error('Party information not found');
      }
    } catch (error: any) {
      console.error('Error loading party data:', error);
      toast.error('Failed to load party data');
    }
  }, []);

  const updateStep1Data = useCallback((data: Partial<Step1Data>) => {
    setBookingState(prev => ({
      ...prev,
      step1Data: { ...prev.step1Data, ...data }
    }));
  }, []);

  const updateStep2Data = useCallback((data: Partial<Step2Data>) => {
    setBookingState(prev => ({
      ...prev,
      step2Data: { ...prev.step2Data, ...data }
    }));
  }, []);

  const updateStep3Data = useCallback((data: Partial<Step3Data>) => {
    setBookingState(prev => ({
      ...prev,
      step3Data: { ...prev.step3Data, ...data }
    }));
  }, []);

  const updateStep4Data = useCallback((data: Partial<Step4Data>) => {
    setBookingState(prev => ({
      ...prev,
      step4Data: { ...prev.step4Data, ...data }
    }));
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setBookingState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const submitStep1 = async () => {
    if (!partyId) return false;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/umrah-visa/group/step1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          partyId,
          ...bookingState.step1Data,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setBookingState(prev => ({
          ...prev,
          completedSteps: [...prev.completedSteps, 1],
          currentStep: 2,
        }));
        setStepDataHashes(prev => ({ ...prev, 1: generateStepDataHash(1) }));
        toast.success('Step 1 validated successfully');
        return true;
      } else {
        toast.error(data.error || 'Failed to validate step 1');
        return false;
      }
    } catch (error) {
      console.error('Error validating step 1:', error);
      toast.error('Failed to validate step 1');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const submitStep2 = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/umrah-visa/group/step2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(bookingState.step2Data),
      });

      const data = await response.json();
      
      if (response.ok) {
        setBookingState(prev => ({
          ...prev,
          completedSteps: [...prev.completedSteps, 2],
          currentStep: 3,
        }));
        setStepDataHashes(prev => ({ ...prev, 2: generateStepDataHash(2) }));
        toast.success('Step 2 validated successfully');
        return true;
      } else {
        toast.error(data.error || 'Failed to validate step 2');
        return false;
      }
    } catch (error) {
      console.error('Error validating step 2:', error);
      toast.error('Failed to validate step 2');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const submitStep3 = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/umrah-visa/group/step3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(bookingState.step3Data),
      });

      const data = await response.json();
      
      if (response.ok) {
        setBookingState(prev => ({
          ...prev,
          completedSteps: [...prev.completedSteps, 3],
          currentStep: 4,
        }));
        setStepDataHashes(prev => ({ ...prev, 3: generateStepDataHash(3) }));
        toast.success('Step 3 validated successfully');
        return true;
      } else {
        toast.error(data.error || 'Failed to validate step 3');
        return false;
      }
    } catch (error) {
      console.error('Error validating step 3:', error);
      toast.error('Failed to validate step 3');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const submitStep4 = async () => {
    if (!partyId) return false;

    setIsLoading(true);
    try {
      const payload = {
        partyId,
        step1: bookingState.step1Data,
        step2: bookingState.step2Data,
        step3: bookingState.step3Data,
        step4: {
          passengerCount: bookingState.step4Data.passengers.length,
          passengers: bookingState.step4Data.passengers.map(p => ({
            fullName: p.fullName,
            isLeadPassenger: p.isLeadPassenger,
            panCardPhoto: p.panCardPhoto,
          })),
        },
      };

      const response = await fetch(`${API_URL}/umrah-visa/group/create-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok) {
        setBookingState(prev => ({
          ...prev,
          bookingId: data.data.bookingId,
          completedSteps: [...prev.completedSteps, 4],
        }));
        toast.success('Group Umrah visa booking completed successfully!');
        return true;
      } else {
        toast.error(data.error || 'Failed to create booking');
        return false;
      }
    } catch (error) {
      console.error('Error creating group booking:', error);
      toast.error('Failed to create booking');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const submitStep = async (stepNumber: number) => {
    const shouldSubmit = !bookingState.completedSteps.includes(stepNumber) || hasStepDataChanged(stepNumber);
    
    if (shouldSubmit) {
      switch (stepNumber) {
        case 1:
          return await submitStep1();
        case 2:
          return await submitStep2();
        case 3:
          return await submitStep3();
        case 4:
          return await submitStep4();
        default:
          return false;
      }
    } else {
      // Step already completed and data hasn't changed, just move to next step
      setCurrentStep(Math.min(stepNumber + 1, 4));
      return true;
    }
  };

  const addPassenger = useCallback(() => {
    setBookingState(prev => ({
      ...prev,
      step4Data: {
        ...prev.step4Data,
        passengers: [...prev.step4Data.passengers, {
          fullName: '',
          isLeadPassenger: false,
          panCardPhoto: null,
          passportFront: null,
          passportBack: null,
          iqamaPhoto: null,
          hotelBooking: null,
          ticketCopy: null,
        }]
      }
    }));
  }, []);

  const removePassenger = useCallback((index: number) => {
    if (bookingState.step4Data.passengers.length <= 1) return;
    
    setBookingState(prev => ({
      ...prev,
      step4Data: {
        ...prev.step4Data,
        passengers: prev.step4Data.passengers.filter((_, i) => i !== index)
      }
    }));
  }, [bookingState.step4Data.passengers.length]);

  const addHotelBooking = useCallback(() => {
    setBookingState(prev => {
      const existingBookings = prev.step3Data.hotelBookings || [];
      let checkInDate = '';
      
      if (existingBookings.length === 0) {
        checkInDate = prev.step2Data.arrivalDate;
      } else {
        const lastBooking = existingBookings[existingBookings.length - 1];
        checkInDate = lastBooking.checkOutDate || '';
      }
      
      return {
        ...prev,
        step3Data: {
          ...prev.step3Data,
          hotelBookings: [
            ...existingBookings,
            {
              locationId: '',
              hotelId: '',
              checkInDate,
              checkOutDate: '',
            },
          ],
        },
      };
    });
  }, []);

  const removeHotelBooking = useCallback((index: number) => {
    setBookingState(prev => {
      const updatedBookings = prev.step3Data.hotelBookings?.filter((_, i) => i !== index) || [];
      
      // Update check-in date of subsequent hotels
      if (updatedBookings[index] && index > 0) {
        const previousHotel = updatedBookings[index - 1];
        if (previousHotel.checkOutDate) {
          updatedBookings[index].checkInDate = previousHotel.checkOutDate;
        }
      } else if (updatedBookings[index] && index === 0) {
        updatedBookings[index].checkInDate = prev.step2Data.arrivalDate;
      }
      
      return {
        ...prev,
        step3Data: {
          ...prev.step3Data,
          hotelBookings: updatedBookings,
        },
      };
    });
  }, []);

  return {
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
  };
};
