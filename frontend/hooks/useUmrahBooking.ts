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
    if (!partyId) {
      toast.error('Party information not found');
      return false;
    }

    setIsLoading(true);
    try {
      // Steps 1-3: Only validate (no DB writes)
      if (stepNumber < 4) {
        const endpoint = `${API_URL}${API_ENDPOINTS[`STEP${stepNumber}` as keyof typeof API_ENDPOINTS]}`;
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
        }

        const response = await fetch(endpoint, {
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
            completedSteps: [...prev.completedSteps, stepNumber],
            currentStep: stepNumber + 1
          }));
          
          toast.success(`Step ${stepNumber} validated successfully`);
          return true;
        } else {
          toast.error(data.error || `Failed to validate step ${stepNumber}`);
          return false;
        }
      } 
      // Step 4: Send ALL data to create-booking endpoint
      else if (stepNumber === 4) {
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
              documents: {
                panCardPhoto: p.panCardPhoto,
                passportFront: p.passportFront,
                passportBack: p.passportBack,
                iqamaPhoto: p.iqamaPhoto,
                hotelBooking: p.hotelBooking,
                ticketCopy: p.ticketCopy,
              }
            })),
          },
        };

        const response = await fetch(`${API_URL}/umrah-visa/create-booking`, {
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
          
          toast.success('Booking completed successfully!');
          return true;
        } else {
          toast.error(data.error || 'Failed to create booking');
          return false;
        }
      }
      
      return false;
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
      
      // Handle new LocationMaster format: { locationMasters: [...] }
      // Transform to backward compatible format if needed
      const airports = data.locationMasters 
        ? data.locationMasters.map((loc: any) => ({
            id: loc.id,
            airportCode: loc.code,
            airportName: loc.name,
            city: loc.city,
            country: loc.country?.countryName || 'Saudi Arabia',
          }))
        : data; // Fallback to old format if array
      
      setMasterData(prev => ({ ...prev, airports }));
    } catch (error) {
      console.error('Error loading airports:', error);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    try {
      // Load from LocationMaster endpoint with locationType='DESTINATION'
      const locationResponse = await fetch(`${API_URL}/umrah-visa/masters/locations?locationType=DESTINATION`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (locationResponse.ok) {
        const locationData = await locationResponse.json();
        // Convert LocationMaster to Location format for compatibility
        const convertedLocations = (locationData.locations || []).map((loc: any) => ({
          id: loc.id,
          destinationCode: loc.code,
          destinationName: loc.name,
          city: loc.city,
          country: loc.country?.countryName || 'Saudi Arabia',
          isActive: loc.isActive,
        }));
        setMasterData(prev => ({ ...prev, locations: convertedLocations }));
      } else {
        console.error('Failed to load locations from LocationMaster');
        setMasterData(prev => ({ ...prev, locations: [] }));
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      setMasterData(prev => ({ ...prev, locations: [] }));
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
