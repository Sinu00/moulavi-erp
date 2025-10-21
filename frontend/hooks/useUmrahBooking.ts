// Umrah Visa Booking Custom Hooks

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { partyAPI } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/umrah/constants';
import { BookingState, MasterData, Step1Data, Step2Data, Step3Data, Step4Data } from '@/lib/umrah/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const useUmrahBooking = () => {
  const [bookingState, setBookingState] = useState<BookingState>({
    currentStep: 1,
    completedSteps: [],
    bookingId: null,
    step1Data: { bookingMode: 'travel_details' },
    step2Data: {
      arrivalDate: '',
      arrivalTime: '',
      arrivalAirportId: '',
      arrivalFlightNumber: '',
      departureDate: '',
      departureTime: '',
      departureAirportId: '',
      departureFlightNumber: '',
    },
    step3Data: { accommodationType: 'hotel' },
    step4Data: {
      passengers: [{ 
        fullName: '', 
        isLeadPassenger: true, 
        panCardPhoto: null, 
        passportFront: null, 
        passportBack: null, 
        iqamaPhoto: null, 
        hotelBooking: null, 
        ticketCopy: null 
      }]
    },
    skipDocuments: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [partyId, setPartyId] = useState<string | null>(null);

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

  const setSkipDocuments = useCallback((skip: boolean) => {
    setBookingState(prev => ({ ...prev, skipDocuments: skip }));
  }, []);

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
      toast.error('Failed to load party information');
    }
  }, []);

  const submitStep = useCallback(async (stepNumber: number) => {
    if (!partyId && stepNumber === 1) {
      toast.error('Party information not found');
      return false;
    }

    if (!bookingState.bookingId && stepNumber > 1) {
      toast.error('Please complete previous steps first');
      return false;
    }

    setIsLoading(true);
    try {
      const endpoint = `${API_URL}${API_ENDPOINTS[`STEP${stepNumber}` as keyof typeof API_ENDPOINTS]}`;
      const url = stepNumber > 1 ? `${endpoint}/${bookingState.bookingId}` : endpoint;
      
      let payload: any;
      
      switch (stepNumber) {
        case 1:
          payload = { partyId, ...bookingState.step1Data };
          break;
        case 2:
          payload = bookingState.step2Data;
          break;
        case 3:
          payload = bookingState.step3Data;
          break;
        case 4:
          const isGroupBooking = bookingState.step1Data.bookingMode === 'group_number';
          
          if (isGroupBooking) {
            const passenger = bookingState.step4Data.passengers[0];
            payload = {
              passengerCount: 1,
              passengers: [{
                fullName: bookingState.step1Data.groupName || 'Group Booking',
                isLeadPassenger: true,
                documents: {
                  panCardPhoto: passenger.panCardPhoto,
                  passportFront: passenger.passportFront,
                  passportBack: passenger.passportBack,
                  iqamaPhoto: passenger.iqamaPhoto,
                  hotelBooking: passenger.hotelBooking,
                  ticketCopy: passenger.ticketCopy,
                }
              }],
            };
          } else {
            payload = {
              passengerCount: bookingState.step4Data.passengers.length,
              passengers: bookingState.step4Data.passengers.map(p => ({
                fullName: p.fullName,
                isLeadPassenger: p.isLeadPassenger,
                documents: {
                  panCardPhoto: p.panCardPhoto,
                  passportFront: p.passportFront,
                  passportBack: p.passportBack,
                  iqamaPhoto: p.iqamaPhoto,
                  hotelBooking: p.hotelBooking,
                  ticketCopy: p.ticketCopy,
                }
              })),
            };
          }
          break;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok) {
        if (stepNumber === 1) {
          setBookingState(prev => ({ ...prev, bookingId: data.bookingId }));
        }
        
        setBookingState(prev => ({
          ...prev,
          completedSteps: [...prev.completedSteps, stepNumber],
          currentStep: stepNumber < 4 ? stepNumber + 1 : stepNumber
        }));
        
        toast.success(`Step ${stepNumber} completed successfully`);
        return true;
      } else {
        toast.error(data.error || `Failed to complete step ${stepNumber}`);
        return false;
      }
    } catch (error) {
      console.error(`Error submitting step ${stepNumber}:`, error);
      toast.error(`Failed to complete step ${stepNumber}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [partyId, bookingState]);

  return {
    bookingState,
    isLoading,
    partyId,
    updateStep1Data,
    updateStep2Data,
    updateStep3Data,
    updateStep4Data,
    setCurrentStep,
    setSkipDocuments,
    loadPartyData,
    submitStep,
  };
};

export const useMasterData = () => {
  const [masterData, setMasterData] = useState<MasterData>({
    airports: [],
    locations: [],
    hotels: [],
    transportOptions: [],
    hotelsByLocation: {},
  });

  const loadAirports = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}${API_ENDPOINTS.AIRPORTS}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      setMasterData(prev => ({ ...prev, airports: data }));
    } catch (error) {
      console.error('Error loading airports:', error);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}${API_ENDPOINTS.DESTINATIONS}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      setMasterData(prev => ({ ...prev, locations: data.destinationMasters || [] }));
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  }, []);

  const loadTransportOptions = useCallback(async (airportId: string) => {
    try {
      const response = await fetch(`${API_URL}${API_ENDPOINTS.TRANSPORT_OPTIONS}/${airportId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      setMasterData(prev => ({ ...prev, transportOptions: data.transportOptions || [] }));
      return data.requiresTransport;
    } catch (error) {
      console.error('Error loading transport options:', error);
      return false;
    }
  }, []);

  const loadHotels = useCallback(async (locationId: string) => {
    try {
      if (masterData.hotelsByLocation[locationId]) {
        setMasterData(prev => ({ ...prev, hotels: masterData.hotelsByLocation[locationId] }));
        return;
      }

      const response = await fetch(`${API_URL}${API_ENDPOINTS.HOTELS}/${locationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      
      setMasterData(prev => ({
        ...prev,
        hotelsByLocation: { ...prev.hotelsByLocation, [locationId]: data },
        hotels: data
      }));
    } catch (error) {
      console.error('Error loading hotels:', error);
    }
  }, [masterData.hotelsByLocation]);

  const getHotelsForLocation = useCallback((locationId: string) => {
    return masterData.hotelsByLocation[locationId] || [];
  }, [masterData.hotelsByLocation]);

  const loadInitialData = useCallback(async () => {
    await Promise.all([
      loadAirports(),
      loadLocations(),
    ]);
  }, [loadAirports, loadLocations]);

  return {
    masterData,
    loadInitialData,
    loadAirports,
    loadLocations,
    loadTransportOptions,
    loadHotels,
    getHotelsForLocation,
  };
};
