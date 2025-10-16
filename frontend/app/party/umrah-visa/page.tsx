'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getUser, hasRole, removeUser } from '@/lib/auth';
import { partyAPI } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
import { ArrowLeft, Check, User, FileText, Calendar, ChevronRight, ChevronLeft, Plane, Home, Users, MapPin, Hotel, Building, LogOut } from 'lucide-react';

// Flight number validation regex: 2 letters + dash + up to 4 numbers (e.g., SV-1234)
const FLIGHT_NUMBER_REGEX = /^[A-Z]{2}-\d{1,4}$/;

interface Step1Data {
  bookingMode: 'group_number' | 'travel_details';
  groupNumber?: string;
  groupName?: string;
}

interface Step2Data {
  arrivalDate: string;
  arrivalTime: string;
  arrivalAirportId: string;
  arrivalFlightNumber: string;
  departureDate: string;
  departureTime: string;
  departureAirportId: string;
  departureFlightNumber: string;
  transportBookings?: Array<{
    fromLocationId: string;
    toLocationId: string;
    vehicleType: string;
    paxCount: number;
    price: number;
    travelDate?: string;
  }>;
}

interface Step3Data {
  accommodationType: 'hotel' | 'iqama';
  iqamaDetails?: {
    iqamaNumber?: string;
    iqamaName?: string;
    iqamaDob?: string;
    iqamaMobile?: string;
  };
  hotelBookings?: Array<{
    locationId: string;
    hotelId: string;
    checkInDate: string;
    checkOutDate: string;
  }>;
}

interface Step4Data {
  passengers: Array<{
    fullName: string;
    isLeadPassenger: boolean;
    panCardPhoto?: File | null;
    passportFront?: File | null;
    passportBack?: File | null;
    iqamaPhoto?: File | null;
    hotelBooking?: File | null;
    ticketCopy?: File | null;
  }>;
}

export default function UmrahVisaNewPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Step data
  const [step1Data, setStep1Data] = useState<Step1Data>({
    bookingMode: 'travel_details',
  });
  const [step2Data, setStep2Data] = useState<Step2Data>({
    arrivalDate: '',
    arrivalTime: '',
    arrivalAirportId: '',
    arrivalFlightNumber: '',
    departureDate: '',
    departureTime: '',
    departureAirportId: '',
    departureFlightNumber: '',
  });
  const [durationDays, setDurationDays] = useState<number>(0);
  const [durationError, setDurationError] = useState<string>('');
  const [step3Data, setStep3Data] = useState<Step3Data>({
    accommodationType: 'hotel',
  });
  const [step4Data, setStep4Data] = useState<Step4Data>({
    passengers: [{ fullName: '', isLeadPassenger: true, panCardPhoto: null, passportFront: null, passportBack: null, iqamaPhoto: null, hotelBooking: null, ticketCopy: null }],
  });
  const [skipDocuments, setSkipDocuments] = useState(false);
  
  // Hotel duration validation dialog
  const [showDurationDialog, setShowDurationDialog] = useState(false);
  const [remainingDays, setRemainingDays] = useState(0);
  const [uncoveredDates, setUncoveredDates] = useState<string[]>([]);
  
  // Track step data changes to allow re-submission when data is modified
  const [stepDataHashes, setStepDataHashes] = useState<{[key: number]: string}>({});

  // Master data
  const [airports, setAirports] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [transportOptions, setTransportOptions] = useState<any[]>([]);
  
  // Per-location hotel cache to prevent data loss
  const [hotelsByLocation, setHotelsByLocation] = useState<{[locationId: string]: any[]}>({});

  const steps = [
    {
      id: 1,
      title: 'Booking Mode',
      description: 'Choose booking type',
      icon: Users,
    },
    {
      id: 2,
      title: 'Travel Details',
      description: 'Flight and transport information',
      icon: Plane,
    },
    {
      id: 3,
      title: 'Accommodation',
      description: 'Hotel or Iqama details',
      icon: Home,
    },
    {
      id: 4,
      title: 'Passengers',
      description: 'Passenger information',
      icon: User,
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

    loadInitialData();
  }, [router]);

  // Preload hotels when hotel bookings change
  useEffect(() => {
    if (currentStep === 3 && step3Data.hotelBookings) {
      preloadHotelsForBookings();
    }
  }, [currentStep, step3Data.hotelBookings]);

  const formatFlightNumber = (value: string): string => {
    // Remove all non-alphanumeric characters except dash
    let cleaned = value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
    
    // Remove any existing dashes
    cleaned = cleaned.replace(/-/g, '');
    
    // Extract letters and numbers
    const letters = cleaned.substring(0, 2).replace(/[^A-Z]/g, '');
    const numbers = cleaned.substring(2).replace(/[^0-9]/g, '').substring(0, 4);
    
    // Build the formatted string
    if (letters.length === 0) {
      return '';
    } else if (letters.length < 2) {
      return letters;
    } else if (numbers.length === 0) {
      return letters + '-';
    } else {
      return letters + '-' + numbers;
    }
  };

  const calculateHotelCoverage = () => {
    if (!step2Data.arrivalDate || !step2Data.departureDate || !step3Data.hotelBookings) {
      return { totalCovered: 0, uncoveredDates: [], remainingDays: 0 };
    }

    const arrivalDate = new Date(step2Data.arrivalDate);
    const departureDate = new Date(step2Data.departureDate);
    const allDates: string[] = [];
    
    // Generate all dates in the travel period
    const currentDate = new Date(arrivalDate);
    while (currentDate < departureDate) {
      allDates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get covered dates from hotel bookings
    const coveredDates = new Set<string>();
    step3Data.hotelBookings.forEach(booking => {
      if (booking.checkInDate && booking.checkOutDate) {
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        const current = new Date(checkIn);
        
        while (current < checkOut) {
          coveredDates.add(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      }
    });

    // Find uncovered dates
    const uncoveredDates = allDates.filter(date => !coveredDates.has(date));
    
    return {
      totalCovered: coveredDates.size,
      uncoveredDates,
      remainingDays: uncoveredDates.length
    };
  };

  const calculateDuration = (arrival: string, departure: string) => {
    if (!arrival || !departure) {
      setDurationDays(0);
      setDurationError('');
      return;
    }

    const arrivalDate = new Date(arrival);
    const departureDate = new Date(departure);
    
    if (departureDate <= arrivalDate) {
      setDurationDays(0);
      setDurationError('Departure date must be after arrival date');
      return;
    }
    
    const diffTime = departureDate.getTime() - arrivalDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    setDurationDays(diffDays);
    
    if (diffDays > 80) {
      setDurationError(`Travel duration (${diffDays} days) exceeds the maximum limit of 80 days`);
    } else {
      setDurationError('');
    }
  };

  const loadInitialData = async () => {
    try {
      console.log('🔍 Loading initial data...');
      console.log('🔑 Current user:', user);
      console.log('🎫 Access token exists:', !!localStorage.getItem('accessToken'));
      
      // Get current user's party information
      const response = await partyAPI.getMyParty();
      console.log('📋 Party API response:', response.data);
      const userParty = response.data.party;
      
      if (userParty) {
        console.log('✅ Party ID loaded:', userParty.id);
        setPartyId(userParty.id);
      } else {
        console.error('❌ No party found in response');
        toast.error('Party information not found');
      }

      // Load master data
      await Promise.all([
        loadAirports(),
        loadLocations(),
      ]);
    } catch (error: any) {
      console.error('❌ Error loading initial data:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      toast.error('Failed to load initial data');
    }
  };

  const loadAirports = async () => {
    try {
      const response = await fetch(`${API_URL}/airport-masters/active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      setAirports(data);
    } catch (error) {
      console.error('Error loading airports:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await fetch(`${API_URL}/destination-masters/active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      setLocations(data.destinationMasters || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadTransportOptions = async (airportId: string) => {
    try {
      console.log('🚌 Loading transport options for airport:', airportId);
      const response = await fetch(`${API_URL}/umrah-visa/transport-options/${airportId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      console.log('🚌 Transport options response:', data);
      setTransportOptions(data.transportOptions || []);
      return data.requiresTransport;
    } catch (error) {
      console.error('❌ Error loading transport options:', error);
      return false;
    }
  };

  const loadHotels = async (locationId: string) => {
    try {
      // Check if hotels for this location are already cached
      if (hotelsByLocation[locationId]) {
        setHotels(hotelsByLocation[locationId]);
        return;
      }

      // Fetch hotels from API
      const response = await fetch(`${API_URL}/umrah-visa/hotels/${locationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      
      // Cache the hotels for this location
      setHotelsByLocation(prev => ({
        ...prev,
        [locationId]: data
      }));
      
      // Set current hotels
      setHotels(data);
    } catch (error) {
      console.error('Error loading hotels:', error);
    }
  };

  // Get hotels for a specific location
  const getHotelsForLocation = (locationId: string) => {
    return hotelsByLocation[locationId] || [];
  };

  // Preload hotels for all selected locations
  const preloadHotelsForBookings = async () => {
    if (!step3Data.hotelBookings) return;
    
    const locationIds = step3Data.hotelBookings
      .map(booking => booking.locationId)
      .filter(id => id && !hotelsByLocation[id]); // Only load if not already cached
    
    if (locationIds.length > 0) {
      // Load hotels for all locations in parallel
      const promises = locationIds.map(locationId => loadHotels(locationId));
      await Promise.all(promises);
    }
  };

  const validateStep1 = () => {
    if (step1Data.bookingMode === 'group_number') {
      if (!step1Data.groupNumber || step1Data.groupNumber.trim() === '') {
        toast.error('Group number is required for group booking mode');
        return false;
      }
      if (!step1Data.groupName || step1Data.groupName.trim() === '') {
        toast.error('Group name is required for group booking mode');
        return false;
      }
    }
    
    return true;
  };

  const validateStep2 = () => {
    if (!step2Data.arrivalDate || !step2Data.arrivalTime || !step2Data.arrivalAirportId || !step2Data.arrivalFlightNumber) {
      toast.error('Please fill in all required arrival details');
      return false;
    }

    if (!step2Data.departureDate || !step2Data.departureTime || !step2Data.departureAirportId || !step2Data.departureFlightNumber) {
      toast.error('Please fill in all required departure details');
      return false;
    }

    if (!FLIGHT_NUMBER_REGEX.test(step2Data.arrivalFlightNumber)) {
      toast.error('Arrival flight number must be in format: XX-1234 (2 letters, dash, 1-4 numbers)');
      return false;
    }

    if (!FLIGHT_NUMBER_REGEX.test(step2Data.departureFlightNumber)) {
      toast.error('Departure flight number must be in format: XX-1234');
      return false;
    }

    // Validate date range (80 days max)
    const arrivalDate = new Date(step2Data.arrivalDate);
    const departureDate = new Date(step2Data.departureDate);
    
    if (departureDate <= arrivalDate) {
      toast.error('Departure date must be after arrival date');
      return false;
    }
    
    const diffTime = departureDate.getTime() - arrivalDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 80) {
      toast.error('Travel duration cannot exceed 80 days');
      return false;
    }

    // Check if transport is required for JED/MED airports
    const selectedAirport = airports.find(a => a.id === step2Data.arrivalAirportId);
    if (selectedAirport && ['JED', 'MED'].includes(selectedAirport.airportCode)) {
      if (!step2Data.transportBookings || step2Data.transportBookings.length === 0) {
        toast.error('Transport selection is required for Jeddah/Medina airports');
        return false;
      }
    }

    return true;
  };

  const validateStep3 = () => {
    // Validate accommodation type specific requirements
    if (step3Data.accommodationType === 'iqama') {
      if (!step3Data.iqamaDetails?.iqamaNumber || !step3Data.iqamaDetails?.iqamaName) {
        toast.error('Please fill in all required iqama details');
        return false;
      }
    } else {
      if (!step3Data.hotelBookings || step3Data.hotelBookings.length === 0) {
        toast.error('Please add at least one hotel booking');
        return false;
      }
      
      // Validate each hotel booking
      for (const booking of step3Data.hotelBookings) {
        if (!booking.locationId || !booking.hotelId || !booking.checkInDate || !booking.checkOutDate) {
          toast.error('Please fill in all hotel booking details');
          return false;
        }
        
        // Validate checkout is after checkin
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        
        if (checkOut <= checkIn) {
          toast.error('Check-out date must be after check-in date');
          return false;
        }
      }

      // Check hotel coverage for the entire travel duration
      const coverage = calculateHotelCoverage();
      if (coverage.remainingDays > 0) {
        setRemainingDays(coverage.remainingDays);
        setUncoveredDates(coverage.uncoveredDates);
        setShowDurationDialog(true);
        return false; // Prevent proceeding until user addresses the gaps
      }
    }
    return true;
  };

  const validateStep4 = () => {
    if (skipDocuments) {
      return true; // Skip validation if test mode
    }

    const isGroupBooking = step1Data.bookingMode === 'group_number';
    
    if (isGroupBooking) {
      // Group booking validation
      if (!step1Data.groupName || step1Data.groupName.trim() === '') {
        toast.error('Group name is required');
        return false;
      }

      // Validate documents based on accommodation type
      const passenger = step4Data.passengers[0]; // Use first passenger for group documents
      
      if (step3Data.accommodationType === 'iqama') {
        // Group + Iqama: Iqama photo + PAN card
        if (!passenger.iqamaPhoto) {
          toast.error('Iqama photo is required');
          return false;
        }
        if (!passenger.panCardPhoto) {
          toast.error('PAN card is required');
          return false;
        }
      } else if (step3Data.accommodationType === 'hotel') {
        // Group + Hotel: PAN card + Hotel booking + Ticket copy
        if (!passenger.panCardPhoto) {
          toast.error('PAN card is required');
          return false;
        }
        if (!passenger.hotelBooking) {
          toast.error('Hotel booking document is required');
          return false;
        }
        if (!passenger.ticketCopy) {
          toast.error('Ticket copy is required');
          return false;
        }
      }
    } else {
      // Regular booking validation
    const passengerCount = step4Data.passengers.length;
    
    // Validate passenger count based on accommodation type
    if (step3Data.accommodationType === 'iqama' && passengerCount > 5) {
      toast.error('Maximum 5 passengers allowed for iqama accommodation');
      return false;
    }

    if (passengerCount < 1) {
      toast.error('At least one passenger is required');
      return false;
    }

    const leadPassengers = step4Data.passengers.filter(p => p.isLeadPassenger);
    if (leadPassengers.length !== 1) {
      toast.error('Exactly one lead passenger is required');
      return false;
    }

    for (const passenger of step4Data.passengers) {
      if (!passenger.fullName.trim()) {
        toast.error('All passengers must have a full name');
        return false;
      }
      
        // Regular booking document requirements
      if (passenger.isLeadPassenger) {
        if (!passenger.panCardPhoto) {
          toast.error('Lead passenger PAN card photo is required');
          return false;
        }
        if (!passenger.passportFront) {
          toast.error('Lead passenger passport front is required');
          return false;
        }
        if (!passenger.passportBack) {
          toast.error('Lead passenger passport back is required');
          return false;
        }
      } else {
        // Validate other passengers documents
        if (!passenger.passportFront) {
          toast.error(`Passport front is required for ${passenger.fullName || 'passenger'}`);
          return false;
        }
        if (!passenger.passportBack) {
          toast.error(`Passport back is required for ${passenger.fullName || 'passenger'}`);
          return false;
          }
        }
      }
    }

    return true;
  };

  const submitStep1 = async () => {
    if (!validateStep1() || !partyId) {
      console.error('❌ Validation failed or no party ID:', { validateStep1: validateStep1(), partyId });
      return;
    }

    console.log('🚀 Submitting Step 1 with data:', { partyId, ...step1Data });
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/umrah-visa/step1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          partyId,
          ...step1Data,
        }),
      });

      console.log('📡 Step 1 response status:', response.status);
      const data = await response.json();
      console.log('📋 Step 1 response data:', data);
      
      if (response.ok) {
        setBookingId(data.bookingId);
        setCompletedSteps(prev => [...prev, 1]);
        setStepDataHashes(prev => ({ ...prev, 1: generateStepDataHash(1) }));
        setCurrentStep(2);
        toast.success('Step 1 completed successfully');
      } else {
        console.error('❌ Step 1 failed:', data);
        toast.error(data.error || 'Failed to complete step 1');
      }
    } catch (error) {
      console.error('❌ Error submitting step 1:', error);
      toast.error('Failed to complete step 1');
    } finally {
      setIsLoading(false);
    }
  };

  const submitStep2 = async () => {
    if (!validateStep2() || !bookingId) return;

    console.log('🚀 Submitting Step 2 with data:', step2Data);
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/umrah-visa/step2/${bookingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(step2Data),
      });

      console.log('📡 Step 2 response status:', response.status);
      const data = await response.json();
      console.log('📋 Step 2 response data:', data);
      
      if (response.ok) {
        setCompletedSteps(prev => [...prev, 2]);
        setStepDataHashes(prev => ({ ...prev, 2: generateStepDataHash(2) }));
        setCurrentStep(3);
        toast.success('Step 2 completed successfully');
      } else {
        console.error('❌ Step 2 failed:', data);
        toast.error(data.error || 'Failed to complete step 2');
      }
    } catch (error) {
      console.error('❌ Error submitting step 2:', error);
      toast.error('Failed to complete step 2');
    } finally {
      setIsLoading(false);
    }
  };

  const submitStep3 = async () => {
    if (!validateStep3() || !bookingId) return;

    setIsLoading(true);
    try {
      // Don't send passengerCount in Step 3 - it will be determined in Step 4
      const response = await fetch(`${API_URL}/umrah-visa/step3/${bookingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(step3Data),
      });

      const data = await response.json();
      if (response.ok) {
        setCompletedSteps(prev => [...prev, 3]);
        setStepDataHashes(prev => ({ ...prev, 3: generateStepDataHash(3) }));
        setCurrentStep(4);
        toast.success('Step 3 completed successfully');
      } else {
        toast.error(data.error || 'Failed to complete step 3');
      }
    } catch (error) {
      console.error('Error submitting step 3:', error);
      toast.error('Failed to complete step 3');
    } finally {
      setIsLoading(false);
    }
  };

  const submitStep4 = async () => {
    if (!validateStep4() || !bookingId) return;

    setIsLoading(true);
    try {
      const isGroupBooking = step1Data.bookingMode === 'group_number';
      
      let payload;
      
      if (isGroupBooking) {
        // Group booking: Use group name and documents from first passenger
        const passenger = step4Data.passengers[0];
        payload = {
          passengerCount: 1, // Group bookings are treated as single entity
          passengers: [{
            fullName: step1Data.groupName || 'Group Booking',
            isLeadPassenger: true,
            // Include document information for backend processing
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
        // Regular booking: Use all passengers
        payload = {
        passengerCount: step4Data.passengers.length,
        passengers: step4Data.passengers.map(p => ({
          fullName: p.fullName,
          isLeadPassenger: p.isLeadPassenger,
            // Include document information for backend processing
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

      const response = await fetch(`${API_URL}/umrah-visa/step4/${bookingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Umrah visa booking completed successfully!');
        router.push('/party/dashboard');
      } else {
        toast.error(data.error || 'Failed to complete step 4');
      }
    } catch (error) {
      console.error('Error submitting step 4:', error);
      toast.error('Failed to complete step 4');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate hash for step data to detect changes
  const generateStepDataHash = (stepNumber: number): string => {
    let dataToHash = '';
    switch (stepNumber) {
      case 1:
        dataToHash = JSON.stringify(step1Data);
        break;
      case 2:
        dataToHash = JSON.stringify(step2Data);
        break;
      case 3:
        dataToHash = JSON.stringify(step3Data);
        break;
      case 4:
        dataToHash = JSON.stringify(step4Data);
        break;
    }
    // Simple hash function
    return btoa(dataToHash).slice(0, 16);
  };

  // Check if step data has changed since last submission
  const hasStepDataChanged = (stepNumber: number): boolean => {
    const currentHash = generateStepDataHash(stepNumber);
    const lastHash = stepDataHashes[stepNumber];
    return currentHash !== lastHash;
  };

  const nextStep = async () => {
    // Submit if step hasn't been completed OR if data has changed
    const shouldSubmit = !completedSteps.includes(currentStep) || hasStepDataChanged(currentStep);
    
    if (shouldSubmit) {
      switch (currentStep) {
        case 1:
          await submitStep1();
          break;
        case 2:
          await submitStep2();
          break;
        case 3:
          await submitStep3();
          break;
        case 4:
          await submitStep4();
          break;
      }
    } else {
      // Step already completed and data hasn't changed, just move to next step
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const goToStep = (stepId: number) => {
    if (stepId <= currentStep || completedSteps.includes(stepId)) {
      setCurrentStep(stepId);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      // Logout should continue even if API call fails
    } finally {
      removeUser();
      toast.success('Logged out successfully');
      router.push('/');
    }
  };

  const addPassenger = () => {
    // Check if iqama and already at limit
    if (step3Data.accommodationType === 'iqama' && step4Data.passengers.length >= 5) {
      toast.error('Maximum 5 passengers allowed for iqama accommodation');
      return;
    }
    
    setStep4Data(prev => ({
      ...prev,
      passengers: [...prev.passengers, { fullName: '', isLeadPassenger: false, panCardPhoto: null, passportFront: null, passportBack: null, iqamaPhoto: null, hotelBooking: null, ticketCopy: null }],
    }));
  };

  const removePassenger = (index: number) => {
    if (step4Data.passengers.length <= 1) {
      toast.error('At least one passenger is required');
      return;
    }
    setStep4Data(prev => ({
      ...prev,
      passengers: prev.passengers.filter((_, i) => i !== index),
    }));
  };

  const addHotelBooking = () => {
    setStep3Data(prev => {
      const existingBookings = prev.hotelBookings || [];
      let checkInDate = '';
      
      if (existingBookings.length === 0) {
        // First hotel: use arrival date from step 2
        checkInDate = step2Data.arrivalDate;
      } else {
        // Subsequent hotels: use check-out date of the last hotel
        const lastBooking = existingBookings[existingBookings.length - 1];
        checkInDate = lastBooking.checkOutDate || '';
      }
      
      return {
        ...prev,
        hotelBookings: [
          ...existingBookings,
          {
            locationId: '',
            hotelId: '',
            checkInDate,
            checkOutDate: '',
          },
        ],
      };
    });
  };

  const handleAddHotelForRemainingDays = () => {
    // Add a hotel for the first uncovered date
    if (uncoveredDates.length > 0) {
      const firstUncoveredDate = uncoveredDates[0];
      const lastUncoveredDate = uncoveredDates[uncoveredDates.length - 1];
      
      // Add a hotel booking for the uncovered period
      setStep3Data(prev => ({
        ...prev,
        hotelBookings: [
          ...(prev.hotelBookings || []),
          {
            locationId: '',
            hotelId: '',
            checkInDate: firstUncoveredDate,
            checkOutDate: new Date(new Date(lastUncoveredDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next day after last uncovered date
          },
        ],
      }));
    }
    setShowDurationDialog(false);
  };

  const handleSkipRemainingDays = () => {
    // User chooses to skip the remaining days
    setShowDurationDialog(false);
    // Proceed to next step
    submitStep3();
  };

  const removeHotelBooking = (index: number) => {
    setStep3Data(prev => {
      const updatedBookings = prev.hotelBookings?.filter((_, i) => i !== index) || [];
      
      // If we removed a hotel and there's a hotel after it, update its check-in date
      if (updatedBookings[index] && index > 0) {
        // Use check-out date of the previous hotel as check-in date
        const previousHotel = updatedBookings[index - 1];
        if (previousHotel.checkOutDate) {
          updatedBookings[index].checkInDate = previousHotel.checkOutDate;
        }
      } else if (updatedBookings[index] && index === 0) {
        // If we removed the first hotel, the new first hotel should use arrival date
        updatedBookings[index].checkInDate = step2Data.arrivalDate;
      }
      
      return {
        ...prev,
        hotelBookings: updatedBookings,
      };
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">Select Booking Mode *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    step1Data.bookingMode === 'group_number' 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setStep1Data(prev => ({ ...prev, bookingMode: 'group_number' }))}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      step1Data.bookingMode === 'group_number' ? 'border-red-500 bg-red-500' : 'border-gray-300'
                    }`} />
                    <div>
                      <h3 className="font-medium">Group Number</h3>
                      <p className="text-sm text-gray-500">I have a masar login</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    step1Data.bookingMode === 'travel_details' 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setStep1Data(prev => ({ ...prev, bookingMode: 'travel_details' }))}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      step1Data.bookingMode === 'travel_details' ? 'border-red-500 bg-red-500' : 'border-gray-300'
                    }`} />
                    <div>
                      <h3 className="font-medium">Travel Details</h3>
                      <p className="text-sm text-gray-500">Booking with travel info</p>
                    </div>
                  </div>
                </div>
              </div>

              {step1Data.bookingMode === 'group_number' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="groupNumber">Group Number *</Label>
                      <Input
                        id="groupNumber"
                        placeholder="Enter group number"
                        value={step1Data.groupNumber || ''}
                        onChange={(e) => setStep1Data(prev => ({ ...prev, groupNumber: e.target.value }))}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="groupName">Group Name *</Label>
                      <Input
                        id="groupName"
                        placeholder="Enter group name"
                        value={step1Data.groupName || ''}
                        onChange={(e) => setStep1Data(prev => ({ ...prev, groupName: e.target.value }))}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {step1Data.bookingMode === 'group_number' && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-5 w-5 text-red-600" />
                  <h3 className="font-medium text-red-900">Group Booking</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-red-700 font-medium">Group Number:</span>
                    <span className="ml-2 text-red-800">{step1Data.groupNumber}</span>
                  </div>
                  <div>
                    <span className="text-red-700 font-medium">Group Name:</span>
                    <span className="ml-2 text-red-800">{step1Data.groupName}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Travel Details Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Travel Details</h4>
                  <p className="text-sm text-gray-600">Enter your arrival and departure information</p>
                </div>
                {durationDays > 0 && (
                  <div className={`text-sm font-medium ${durationError ? 'text-red-600' : 'text-green-600'}`}>
                    {durationError || `✓ Travel duration: ${durationDays} day${durationDays > 1 ? 's' : ''}`}
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                          Type
                        </th>
                        <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                          Airport
                        </th>
                        <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                          Flight Number
                        </th>
                        <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                          Date
                        </th>
                        <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Arrival Row */}
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-200 p-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="font-medium text-green-700">Arrival</span>
                          </div>
                        </td>
                        <td className="border border-gray-200 p-3">
                          <Select 
                            value={step2Data.arrivalAirportId} 
                            onValueChange={async (value) => {
                              setStep2Data(prev => ({ ...prev, arrivalAirportId: value }));
                              await loadTransportOptions(value);
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select arrival airport" />
                            </SelectTrigger>
                            <SelectContent>
                              {airports.map((airport) => (
                                <SelectItem key={airport.id} value={airport.id}>
                                  {airport.airportCode} - {airport.airportName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="border border-gray-200 p-3">
                          <Input
                            placeholder="e.g., SV-1234"
                            value={step2Data.arrivalFlightNumber}
                            onChange={(e) => {
                              const formatted = formatFlightNumber(e.target.value);
                              setStep2Data(prev => ({ ...prev, arrivalFlightNumber: formatted }));
                            }}
                            disabled={isLoading}
                            maxLength={7}
                            className="w-full"
                          />
                        </td>
                        <td className="border border-gray-200 p-3">
                          <Input
                            type="date"
                            value={step2Data.arrivalDate}
                            onChange={(e) => {
                              setStep2Data(prev => ({ ...prev, arrivalDate: e.target.value }));
                              calculateDuration(e.target.value, step2Data.departureDate);
                            }}
                            disabled={isLoading}
                            className="w-full"
                          />
                        </td>
                        <td className="border border-gray-200 p-3">
                          <Input
                            type="time"
                            value={step2Data.arrivalTime}
                            onChange={(e) => {
                              setStep2Data(prev => ({ ...prev, arrivalTime: e.target.value }));
                            }}
                            disabled={isLoading}
                            className="w-full"
                          />
                        </td>
                      </tr>

                      {/* Departure Row */}
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-200 p-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="font-medium text-red-700">Departure</span>
                          </div>
                        </td>
                        <td className="border border-gray-200 p-3">
                          <Select 
                            value={step2Data.departureAirportId} 
                            onValueChange={(value) => setStep2Data(prev => ({ ...prev, departureAirportId: value }))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select departure airport" />
                            </SelectTrigger>
                            <SelectContent>
                              {airports.map((airport) => (
                                <SelectItem key={airport.id} value={airport.id}>
                                  {airport.airportCode} - {airport.airportName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="border border-gray-200 p-3">
                          <Input
                            placeholder="e.g., SV-1234"
                            value={step2Data.departureFlightNumber}
                            onChange={(e) => {
                              const formatted = formatFlightNumber(e.target.value);
                              setStep2Data(prev => ({ ...prev, departureFlightNumber: formatted }));
                            }}
                            disabled={isLoading}
                            maxLength={7}
                            className="w-full"
                          />
                        </td>
                        <td className="border border-gray-200 p-3">
                          <Input
                            type="date"
                            value={step2Data.departureDate}
                            onChange={(e) => {
                              setStep2Data(prev => ({ ...prev, departureDate: e.target.value }));
                              calculateDuration(step2Data.arrivalDate, e.target.value);
                            }}
                            disabled={isLoading}
                            className="w-full"
                          />
                        </td>
                        <td className="border border-gray-200 p-3">
                          <Input
                            type="time"
                            value={step2Data.departureTime}
                            onChange={(e) => {
                              setStep2Data(prev => ({ ...prev, departureTime: e.target.value }));
                            }}
                            disabled={isLoading}
                            className="w-full"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden">
                <div className="space-y-4">
                  {/* Arrival Card */}
                  <Card className="p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <h5 className="font-medium text-green-700">Arrival Details</h5>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Date *</Label>
                        <Input
                          type="date"
                          value={step2Data.arrivalDate}
                          onChange={(e) => {
                            setStep2Data(prev => ({ ...prev, arrivalDate: e.target.value }));
                            calculateDuration(e.target.value, step2Data.departureDate);
                          }}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Time *</Label>
                        <Input
                          type="time"
                          value={step2Data.arrivalTime}
                          onChange={(e) => {
                            setStep2Data(prev => ({ ...prev, arrivalTime: e.target.value }));
                          }}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Airport *</Label>
                        <Select 
                          value={step2Data.arrivalAirportId} 
                          onValueChange={async (value) => {
                            setStep2Data(prev => ({ ...prev, arrivalAirportId: value }));
                            await loadTransportOptions(value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select arrival airport" />
                          </SelectTrigger>
                          <SelectContent>
                            {airports.map((airport) => (
                              <SelectItem key={airport.id} value={airport.id}>
                                {airport.airportCode} - {airport.airportName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Flight Number *</Label>
                        <Input
                          placeholder="e.g., SV-1234"
                          value={step2Data.arrivalFlightNumber}
                          onChange={(e) => {
                            const formatted = formatFlightNumber(e.target.value);
                            setStep2Data(prev => ({ ...prev, arrivalFlightNumber: formatted }));
                          }}
                          disabled={isLoading}
                          maxLength={7}
                        />
                        <p className="text-xs text-gray-500">Format: XX-1234 (2 letters, dash, 1-4 numbers)</p>
                      </div>
                    </div>
                  </Card>

                  {/* Departure Card */}
                  <Card className="p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <h5 className="font-medium text-red-700">Departure Details</h5>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Date *</Label>
                        <Input
                          type="date"
                          value={step2Data.departureDate}
                          onChange={(e) => {
                            setStep2Data(prev => ({ ...prev, departureDate: e.target.value }));
                            calculateDuration(step2Data.arrivalDate, e.target.value);
                          }}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Time *</Label>
                        <Input
                          type="time"
                          value={step2Data.departureTime}
                          onChange={(e) => {
                            setStep2Data(prev => ({ ...prev, departureTime: e.target.value }));
                          }}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Airport *</Label>
                        <Select 
                          value={step2Data.departureAirportId} 
                          onValueChange={(value) => setStep2Data(prev => ({ ...prev, departureAirportId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select departure airport" />
                          </SelectTrigger>
                          <SelectContent>
                            {airports.map((airport) => (
                              <SelectItem key={airport.id} value={airport.id}>
                                {airport.airportCode} - {airport.airportName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Flight Number *</Label>
                        <Input
                          placeholder="e.g., SV-1234"
                          value={step2Data.departureFlightNumber}
                          onChange={(e) => {
                            const formatted = formatFlightNumber(e.target.value);
                            setStep2Data(prev => ({ ...prev, departureFlightNumber: formatted }));
                          }}
                          disabled={isLoading}
                          maxLength={7}
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Duration Summary */}
                  {durationDays > 0 && (
                    <Card className="p-4 bg-blue-50 border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-900">Travel Duration</span>
                        </div>
                        <div className={`text-lg font-bold ${durationError ? 'text-red-600' : 'text-blue-600'}`}>
                          {durationError || `${durationDays} day${durationDays > 1 ? 's' : ''}`}
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>

            {/* Transport Options */}
            {transportOptions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Transport Options</h4>
                    <p className="text-sm text-gray-600">
                      Transport selection is required for Jeddah/Medina airports
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    From: {transportOptions[0]?.fromLocation?.destinationName}
                  </div>
                </div>
                
                {/* Matrix Table View */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                          Destination
                        </th>
                        {Array.from(new Set(transportOptions.map(opt => opt.vehicleType))).map(vehicleType => {
                          const sampleOption = transportOptions.find(opt => opt.vehicleType === vehicleType);
                          return (
                            <th key={vehicleType} className="border border-gray-200 p-3 text-center text-sm font-medium text-gray-700">
                              <div>{vehicleType}</div>
                              <div className="text-xs text-gray-500">({sampleOption?.paxCount} pax)</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(new Set(transportOptions.map(opt => opt.toLocation.destinationName))).map(destination => {
                        const destinationOptions = transportOptions.filter(opt => opt.toLocation.destinationName === destination);
                        const vehicleTypes = Array.from(new Set(transportOptions.map(opt => opt.vehicleType)));
                        
                        return (
                          <tr key={destination} className="hover:bg-gray-50">
                            <td className="border border-gray-200 p-3 font-medium text-gray-900">
                              {destination}
                            </td>
                            {vehicleTypes.map(vehicleType => {
                              const option = destinationOptions.find(opt => opt.vehicleType === vehicleType);
                              const isSelected = step2Data.transportBookings?.some(
                                booking => booking.toLocationId === option?.toLocationId && 
                                          booking.vehicleType === vehicleType
                              );
                              
                              return (
                                <td 
                                  key={vehicleType} 
                                  className={`border border-gray-200 p-3 text-center cursor-pointer transition-all duration-200 ${
                                    option 
                                      ? isSelected 
                                        ? 'bg-green-100 border-green-300 hover:bg-green-200' 
                                        : 'hover:bg-blue-50 hover:border-blue-300'
                                      : 'bg-gray-50'
                                  }`}
                                  onClick={() => {
                                    if (option) {
                                      if (isSelected) {
                                        // Remove if already selected
                                        setStep2Data(prev => ({
                                          ...prev,
                                          transportBookings: prev.transportBookings?.filter(
                                            booking => !(booking.toLocationId === option.toLocationId && 
                                                       booking.vehicleType === vehicleType)
                                          ) || []
                                        }));
                                        toast.success(`Removed ${option.vehicleType} from ${destination}`);
                                      } else {
                                        // Add new selection
                                        const newTransportBooking = {
                                          fromLocationId: option.fromLocationId,
                                          toLocationId: option.toLocationId,
                                          vehicleType: option.vehicleType,
                                          paxCount: option.paxCount,
                                          price: Number(option.price),
                                          travelDate: step2Data.arrivalDate,
                                        };
                                        
                                        setStep2Data(prev => ({
                                          ...prev,
                                          transportBookings: [...(prev.transportBookings || []), newTransportBooking]
                                        }));
                                        
                                        toast.success(`Selected ${option.vehicleType} to ${destination}`);
                                      }
                                    }
                                  }}
                                >
                                  {option ? (
                                    <div className="space-y-1">
                                      <div className={`font-medium ${isSelected ? 'text-green-700' : 'text-green-600'}`}>
                                        {Number(option.price).toFixed(2)} SAR
                                      </div>
                                      <div className={`text-xs ${isSelected ? 'text-green-600' : 'text-gray-500'}`}>
                                        {isSelected ? '✓ Selected' : 'Click to select'}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden">
                  {Array.from(new Set(transportOptions.map(opt => opt.toLocation.destinationName))).map(destination => {
                    const destinationOptions = transportOptions.filter(opt => opt.toLocation.destinationName === destination);
                    
                    return (
                      <Card key={destination} className="p-4 mb-4">
                        <h5 className="font-medium text-gray-900 mb-3">{destination}</h5>
                        <div className="space-y-2">
                          {destinationOptions.map((option, index) => {
                            const isSelected = step2Data.transportBookings?.some(
                              booking => booking.toLocationId === option.toLocationId && 
                                        booking.vehicleType === option.vehicleType
                            );
                            
                            return (
                              <div 
                                key={index} 
                                className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                                  isSelected 
                                    ? 'bg-green-100 border-2 border-green-300' 
                                    : 'bg-gray-50 border-2 border-transparent hover:bg-blue-50 hover:border-blue-300'
                                }`}
                                onClick={() => {
                                  if (isSelected) {
                                    // Remove if already selected
                                    setStep2Data(prev => ({
                                      ...prev,
                                      transportBookings: prev.transportBookings?.filter(
                                        booking => !(booking.toLocationId === option.toLocationId && 
                                                   booking.vehicleType === option.vehicleType)
                                      ) || []
                                    }));
                                    toast.success(`Removed ${option.vehicleType} from ${destination}`);
                                  } else {
                                    // Add new selection
                                    const newTransportBooking = {
                                      fromLocationId: option.fromLocationId,
                                      toLocationId: option.toLocationId,
                                      vehicleType: option.vehicleType,
                                      paxCount: option.paxCount,
                                      price: Number(option.price),
                                      travelDate: step2Data.arrivalDate,
                                    };
                                    
                                    setStep2Data(prev => ({
                                      ...prev,
                                      transportBookings: [...(prev.transportBookings || []), newTransportBooking]
                                    }));
                                    
                                    toast.success(`Selected ${option.vehicleType} to ${destination}`);
                                  }
                                }}
                              >
                                <div>
                                  <div className="font-medium">{option.vehicleType}</div>
                                  <div className="text-sm text-gray-600">{option.paxCount} passengers</div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-medium ${isSelected ? 'text-green-700' : 'text-green-600'}`}>
                                    {Number(option.price).toFixed(2)} SAR
                                  </div>
                                  <div className={`text-xs ${isSelected ? 'text-green-600' : 'text-gray-500'}`}>
                                    {isSelected ? '✓ Selected' : 'Tap to select'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    );
                  })}
                </div>
                
                {/* Show selected transport bookings */}
                {step2Data.transportBookings && step2Data.transportBookings.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900">Selected Transport:</h5>
                    {step2Data.transportBookings.map((booking, index) => (
                      <div key={index} className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{booking.vehicleType}</p>
                            <p className="text-sm text-gray-600">
                              {booking.paxCount} passengers • {Number(booking.price).toFixed(2)} SAR
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setStep2Data(prev => ({
                                ...prev,
                                transportBookings: prev.transportBookings?.filter((_, i) => i !== index) || []
                              }));
                              toast.success('Transport removed');
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">Select Accommodation Type *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    step3Data.accommodationType === 'hotel' 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setStep3Data(prev => ({ ...prev, accommodationType: 'hotel' }))}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      step3Data.accommodationType === 'hotel' ? 'border-red-500 bg-red-500' : 'border-gray-300'
                    }`} />
                    <div>
                      <h3 className="font-medium">Hotel Booking</h3>
                      <p className="text-sm text-gray-500">Select hotels by location</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    step3Data.accommodationType === 'iqama' 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setStep3Data(prev => ({ ...prev, accommodationType: 'iqama' }))}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      step3Data.accommodationType === 'iqama' ? 'border-red-500 bg-red-500' : 'border-gray-300'
                    }`} />
                    <div>
                      <h3 className="font-medium">Iqama Sponsor</h3>
                      <p className="text-sm text-gray-500">Stay with sponsor</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {step3Data.accommodationType === 'hotel' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Hotel Bookings</h4>
                    <p className="text-sm text-gray-600">Add hotels for your accommodation</p>
                    <p className="text-xs text-blue-600 mt-1">
                      💡 Check-in dates are auto-filled: First hotel uses arrival date, subsequent hotels use previous hotel's check-out date
                    </p>
                    {step3Data.hotelBookings && step3Data.hotelBookings.length > 0 && (
                      <div className="mt-2">
                        {(() => {
                          const coverage = calculateHotelCoverage();
                          const totalDays = durationDays;
                          const coveredDays = totalDays - coverage.remainingDays;
                          const coveragePercentage = totalDays > 0 ? Math.round((coveredDays / totalDays) * 100) : 0;
                          
                          return (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-600">Coverage:</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    coveragePercentage === 100 ? 'bg-green-500' : 
                                    coveragePercentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${coveragePercentage}%` }}
                                />
                              </div>
                              <span className={`font-medium ${
                                coveragePercentage === 100 ? 'text-green-600' : 
                                coveragePercentage >= 80 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {coveredDays}/{totalDays} days ({coveragePercentage}%)
                              </span>
                              {coverage.remainingDays > 0 && (
                                <span className="text-red-600 font-medium">
                                  ⚠️ {coverage.remainingDays} day{coverage.remainingDays > 1 ? 's' : ''} uncovered
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addHotelBooking}>
                    <Hotel className="h-4 w-4 mr-2" />
                    Add Hotel
                  </Button>
                </div>
                
                {step3Data.hotelBookings && step3Data.hotelBookings.length > 0 ? (
                  <div className="space-y-4">
                    {/* Desktop Table View */}
                    <div className="hidden lg:block">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                                #
                              </th>
                              <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                                Location
                              </th>
                              <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                                Hotel
                              </th>
                              <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                                Check-in
                              </th>
                              <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                                Check-out
                              </th>
                              <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-700">
                                Duration
                              </th>
                              <th className="border border-gray-200 p-3 text-center text-sm font-medium text-gray-700">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {step3Data.hotelBookings.map((booking, index) => {
                              const location = locations.find(l => l.id === booking.locationId);
                              const hotel = hotels.find(h => h.id === booking.hotelId);
                              const checkIn = booking.checkInDate ? new Date(booking.checkInDate) : null;
                              const checkOut = booking.checkOutDate ? new Date(booking.checkOutDate) : null;
                              const duration = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                              
                              return (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="border border-gray-200 p-3 font-medium text-gray-900">
                                    {index + 1}
                                  </td>
                                  <td className="border border-gray-200 p-3">
                                    <Select 
                                      value={booking.locationId} 
                                      onValueChange={(value) => {
                                        const updatedBookings = [...(step3Data.hotelBookings || [])];
                                        updatedBookings[index].locationId = value;
                                        updatedBookings[index].hotelId = ''; // Reset hotel selection
                                        setStep3Data(prev => ({ ...prev, hotelBookings: updatedBookings }));
                                        loadHotels(value);
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select location" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {locations.map((location) => (
                                          <SelectItem key={location.id} value={location.id}>
                                            {location.destinationName}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="border border-gray-200 p-3">
                                    <Select 
                                      value={booking.hotelId} 
                                      onValueChange={(value) => {
                                        const updatedBookings = [...(step3Data.hotelBookings || [])];
                                        updatedBookings[index].hotelId = value;
                                        setStep3Data(prev => ({ ...prev, hotelBookings: updatedBookings }));
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select hotel" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {getHotelsForLocation(booking.locationId).map((hotel) => (
                                          <SelectItem key={hotel.id} value={hotel.id}>
                                            {hotel.hotelName}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="border border-gray-200 p-3">
                                    <Input
                                      type="date"
                                      value={booking.checkInDate}
                                      onChange={(e) => {
                                        const updatedBookings = [...(step3Data.hotelBookings || [])];
                                        updatedBookings[index].checkInDate = e.target.value;
                                        setStep3Data(prev => ({ ...prev, hotelBookings: updatedBookings }));
                                      }}
                                      className="w-full"
                                    />
                                  </td>
                                  <td className="border border-gray-200 p-3">
                                    <Input
                                      type="date"
                                      value={booking.checkOutDate}
                                      onChange={(e) => {
                                        const updatedBookings = [...(step3Data.hotelBookings || [])];
                                        updatedBookings[index].checkOutDate = e.target.value;
                                        
                                        // Update check-in date of the next hotel if it exists
                                        if (updatedBookings[index + 1]) {
                                          updatedBookings[index + 1].checkInDate = e.target.value;
                                        }
                                        
                                        setStep3Data(prev => ({ ...prev, hotelBookings: updatedBookings }));
                                      }}
                                      className="w-full"
                                    />
                                  </td>
                                  <td className="border border-gray-200 p-3">
                                    <div className="text-sm text-gray-600">
                                      {duration > 0 ? `${duration} night${duration > 1 ? 's' : ''}` : '-'}
                                    </div>
                                  </td>
                                  <td className="border border-gray-200 p-3 text-center">
                                    {step3Data.hotelBookings!.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeHotelBooking(index)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        Remove
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden">
                      {step3Data.hotelBookings.map((booking, index) => {
                        const location = locations.find(l => l.id === booking.locationId);
                        const hotel = hotels.find(h => h.id === booking.hotelId);
                        const checkIn = booking.checkInDate ? new Date(booking.checkInDate) : null;
                        const checkOut = booking.checkOutDate ? new Date(booking.checkOutDate) : null;
                        const duration = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                        
                        return (
                          <Card key={index} className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="font-medium">Hotel {index + 1}</h5>
                              {step3Data.hotelBookings!.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeHotelBooking(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                            
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                  <Label>Location *</Label>
                                  <Select 
                                    value={booking.locationId} 
                                    onValueChange={(value) => {
                                      const updatedBookings = [...(step3Data.hotelBookings || [])];
                                      updatedBookings[index].locationId = value;
                                      updatedBookings[index].hotelId = ''; // Reset hotel selection
                                      setStep3Data(prev => ({ ...prev, hotelBookings: updatedBookings }));
                                      loadHotels(value);
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {locations.map((location) => (
                                        <SelectItem key={location.id} value={location.id}>
                                          {location.destinationName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Hotel *</Label>
                                  <Select 
                                    value={booking.hotelId} 
                                    onValueChange={(value) => {
                                      const updatedBookings = [...(step3Data.hotelBookings || [])];
                                      updatedBookings[index].hotelId = value;
                                      setStep3Data(prev => ({ ...prev, hotelBookings: updatedBookings }));
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select hotel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getHotelsForLocation(booking.locationId).map((hotel) => (
                                        <SelectItem key={hotel.id} value={hotel.id}>
                                          {hotel.hotelName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Label>Check-in Date *</Label>
                                    {(index === 0 && booking.checkInDate === step2Data.arrivalDate) || 
                                     (index > 0 && booking.checkInDate === step3Data.hotelBookings?.[index - 1]?.checkOutDate) ? (
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                        Auto-filled
                                      </span>
                                    ) : null}
                                  </div>
                                  <Input
                                    type="date"
                                    value={booking.checkInDate}
                                    onChange={(e) => {
                                      const updatedBookings = [...(step3Data.hotelBookings || [])];
                                      updatedBookings[index].checkInDate = e.target.value;
                                      setStep3Data(prev => ({ ...prev, hotelBookings: updatedBookings }));
                                    }}
                                    className={(index === 0 && booking.checkInDate === step2Data.arrivalDate) || 
                                               (index > 0 && booking.checkInDate === step3Data.hotelBookings?.[index - 1]?.checkOutDate) ? 
                                               'border-blue-300 bg-blue-50' : ''}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Check-out Date *</Label>
                                  <Input
                                    type="date"
                                    value={booking.checkOutDate}
                                    onChange={(e) => {
                                      const updatedBookings = [...(step3Data.hotelBookings || [])];
                                      updatedBookings[index].checkOutDate = e.target.value;
                                      
                                      // Update check-in date of the next hotel if it exists
                                      if (updatedBookings[index + 1]) {
                                        updatedBookings[index + 1].checkInDate = e.target.value;
                                      }
                                      
                                      setStep3Data(prev => ({ ...prev, hotelBookings: updatedBookings }));
                                    }}
                                  />
                                </div>
                              </div>

                              {duration > 0 && (
                                <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                                  Duration: {duration} night{duration > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <Hotel className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hotel bookings added</h3>
                    <p className="text-gray-500 mb-4">Add your first hotel booking to get started</p>
                    <Button type="button" variant="outline" onClick={addHotelBooking}>
                      <Hotel className="h-4 w-4 mr-2" />
                      Add First Hotel
                    </Button>
                  </div>
                )}
              </div>
            )}

            {step3Data.accommodationType === 'iqama' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="iqamaNumber">Iqama Number *</Label>
                  <Input
                    id="iqamaNumber"
                    placeholder="Enter iqama number"
                    value={step3Data.iqamaDetails?.iqamaNumber || ''}
                    onChange={(e) => setStep3Data(prev => ({
                      ...prev,
                      iqamaDetails: { ...prev.iqamaDetails, iqamaNumber: e.target.value }
                    }))}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iqamaName">Iqama Name *</Label>
                  <Input
                    id="iqamaName"
                    placeholder="Enter iqama holder name"
                    value={step3Data.iqamaDetails?.iqamaName || ''}
                    onChange={(e) => setStep3Data(prev => ({
                      ...prev,
                      iqamaDetails: { ...prev.iqamaDetails, iqamaName: e.target.value }
                    }))}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iqamaDob">Date of Birth</Label>
                  <Input
                    id="iqamaDob"
                    type="date"
                    value={step3Data.iqamaDetails?.iqamaDob || ''}
                    onChange={(e) => setStep3Data(prev => ({
                      ...prev,
                      iqamaDetails: { ...prev.iqamaDetails, iqamaDob: e.target.value }
                    }))}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iqamaMobile">Mobile Number</Label>
                  <Input
                    id="iqamaMobile"
                    type="tel"
                    placeholder="+966 123456789"
                    value={step3Data.iqamaDetails?.iqamaMobile || ''}
                    onChange={(e) => setStep3Data(prev => ({
                      ...prev,
                      iqamaDetails: { ...prev.iqamaDetails, iqamaMobile: e.target.value }
                    }))}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Passenger Documents</h4>
                <p className="text-sm text-gray-600">
                  Upload required documents for each passenger
                </p>
                {(() => {
                  const isGroupBooking = step1Data.bookingMode === 'group_number';
                  if (isGroupBooking) {
                    if (step3Data.accommodationType === 'iqama') {
                      return (
                        <div className="flex items-center gap-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          <span>📋</span>
                          <span>Group + Iqama: Iqama Photo & PAN Card required</span>
                        </div>
                      );
                    } else if (step3Data.accommodationType === 'hotel') {
                      return (
                        <div className="flex items-center gap-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          <span>🏨</span>
                          <span>Group + Hotel: PAN Card, Hotel Booking & Ticket Copy required</span>
                        </div>
                      );
                    }
                  } else {
                    return (
                      <div className="flex items-center gap-2 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        <span>📄</span>
                        <span>Regular: Lead passenger PAN + Passport, Others Passport only</span>
                      </div>
                    );
                  }
                })()}
              </div>
              
              {/* Test Mode Toggle */}
              <div className="flex items-center space-x-2 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
                <input
                  type="checkbox"
                  id="skipDocuments"
                  checked={skipDocuments}
                  onChange={(e) => setSkipDocuments(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="skipDocuments" className="text-sm text-yellow-800 cursor-pointer">
                  Skip Documents (Test Mode)
                </Label>
              </div>
            </div>

            {step1Data.bookingMode !== 'group_number' && step3Data.accommodationType === 'iqama' && step4Data.passengers.length > 5 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  ⚠️ Maximum 5 passengers allowed for iqama accommodation. Please remove {step4Data.passengers.length - 5} passenger(s).
                </p>
              </div>
            )}

            {step1Data.bookingMode === 'group_number' ? (
              // Group booking: Single document upload section
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium">Group Documents</h5>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Group Name *</Label>
                      <Input
                        placeholder="Enter group name"
                        value={step1Data.groupName || ''}
                        onChange={(e) => setStep1Data(prev => ({ ...prev, groupName: e.target.value }))}
                        disabled={isLoading}
                      />
                    </div>

                    {!skipDocuments && (() => {
                      if (step3Data.accommodationType === 'iqama') {
                        // Group + Iqama: Iqama photo + PAN card
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Iqama Photo *</Label>
                              <Input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  setStep4Data(prev => ({
                                    ...prev,
                                    passengers: [{
                                      ...prev.passengers[0],
                                      iqamaPhoto: file
                                    }]
                                  }));
                                }}
                                disabled={isLoading}
                              />
                              {step4Data.passengers[0]?.iqamaPhoto && (
                                <p className="text-xs text-green-600">✓ {step4Data.passengers[0].iqamaPhoto.name}</p>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <Label>PAN Card *</Label>
                              <Input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  setStep4Data(prev => ({
                                    ...prev,
                                    passengers: [{
                                      ...prev.passengers[0],
                                      panCardPhoto: file
                                    }]
                                  }));
                                }}
                                disabled={isLoading}
                              />
                              {step4Data.passengers[0]?.panCardPhoto && (
                                <p className="text-xs text-green-600">✓ {step4Data.passengers[0].panCardPhoto.name}</p>
                              )}
                            </div>
                          </div>
                        );
                      } else if (step3Data.accommodationType === 'hotel') {
                        // Group + Hotel: PAN card + Hotel booking + Ticket copy
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>PAN Card *</Label>
                              <Input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  setStep4Data(prev => ({
                                    ...prev,
                                    passengers: [{
                                      ...prev.passengers[0],
                                      panCardPhoto: file
                                    }]
                                  }));
                                }}
                                disabled={isLoading}
                              />
                              {step4Data.passengers[0]?.panCardPhoto && (
                                <p className="text-xs text-green-600">✓ {step4Data.passengers[0].panCardPhoto.name}</p>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Hotel Booking *</Label>
                              <Input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  setStep4Data(prev => ({
                                    ...prev,
                                    passengers: [{
                                      ...prev.passengers[0],
                                      hotelBooking: file
                                    }]
                                  }));
                                }}
                                disabled={isLoading}
                              />
                              {step4Data.passengers[0]?.hotelBooking && (
                                <p className="text-xs text-green-600">✓ {step4Data.passengers[0].hotelBooking.name}</p>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Ticket Copy *</Label>
                              <Input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  setStep4Data(prev => ({
                                    ...prev,
                                    passengers: [{
                                      ...prev.passengers[0],
                                      ticketCopy: file
                                    }]
                                  }));
                                }}
                                disabled={isLoading}
                              />
                              {step4Data.passengers[0]?.ticketCopy && (
                                <p className="text-xs text-green-600">✓ {step4Data.passengers[0].ticketCopy.name}</p>
                              )}
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </Card>
              </div>
            ) : (
              // Regular booking: Passenger management system
              <>
            <div className="flex justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={addPassenger}
                disabled={step3Data.accommodationType === 'iqama' && step4Data.passengers.length >= 5}
              >
                <Users className="h-4 w-4 mr-2" />
                Add Passenger
                {step3Data.accommodationType === 'iqama' && ` (${step4Data.passengers.length}/5)`}
              </Button>
            </div>

            <div className="space-y-4">
              {step4Data.passengers.map((passenger, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium">
                      Passenger {index + 1} {passenger.isLeadPassenger && '(Lead Passenger)'}
                    </h5>
                    <div className="flex items-center space-x-2">
                      {index === 0 && (
                        <div className="flex items-center space-x-2 mr-4">
                          <input
                            type="checkbox"
                            id={`lead-${index}`}
                            checked={passenger.isLeadPassenger}
                            onChange={(e) => {
                              const updatedPassengers = [...step4Data.passengers];
                              // Ensure only one lead passenger
                              updatedPassengers.forEach((p, i) => {
                                p.isLeadPassenger = i === index ? e.target.checked : false;
                              });
                              setStep4Data(prev => ({ ...prev, passengers: updatedPassengers }));
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={`lead-${index}`} className="text-sm">
                            Lead Passenger
                          </Label>
                        </div>
                      )}
                      {step4Data.passengers.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removePassenger(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        placeholder="As per passport"
                        value={passenger.fullName}
                        onChange={(e) => {
                          const updatedPassengers = [...step4Data.passengers];
                          updatedPassengers[index].fullName = e.target.value;
                          setStep4Data(prev => ({ ...prev, passengers: updatedPassengers }));
                        }}
                        disabled={isLoading}
                      />
                    </div>

                    {!skipDocuments && (() => {
                      const isGroupBooking = step1Data.bookingMode === 'group_number';
                      
                      if (isGroupBooking) {
                        // Group booking document requirements
                        if (step3Data.accommodationType === 'iqama') {
                          // Group + Iqama: Iqama photo + PAN card
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Iqama Photo *</Label>
                                <Input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    const updatedPassengers = [...step4Data.passengers];
                                    updatedPassengers[index].iqamaPhoto = file;
                                    setStep4Data(prev => ({ ...prev, passengers: updatedPassengers }));
                                  }}
                                  disabled={isLoading}
                                />
                                {passenger.iqamaPhoto && (
                                  <p className="text-xs text-green-600">✓ {passenger.iqamaPhoto.name}</p>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <Label>PAN Card *</Label>
                                <Input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    const updatedPassengers = [...step4Data.passengers];
                                    updatedPassengers[index].panCardPhoto = file;
                                    setStep4Data(prev => ({ ...prev, passengers: updatedPassengers }));
                                  }}
                                  disabled={isLoading}
                                />
                                {passenger.panCardPhoto && (
                                  <p className="text-xs text-green-600">✓ {passenger.panCardPhoto.name}</p>
                                )}
                              </div>
                            </div>
                          );
                        } else if (step3Data.accommodationType === 'hotel') {
                          // Group + Hotel: PAN card + Hotel booking + Ticket copy
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>PAN Card *</Label>
                                <Input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    const updatedPassengers = [...step4Data.passengers];
                                    updatedPassengers[index].panCardPhoto = file;
                                    setStep4Data(prev => ({ ...prev, passengers: updatedPassengers }));
                                  }}
                                  disabled={isLoading}
                                />
                                {passenger.panCardPhoto && (
                                  <p className="text-xs text-green-600">✓ {passenger.panCardPhoto.name}</p>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Hotel Booking *</Label>
                                <Input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    const updatedPassengers = [...step4Data.passengers];
                                    updatedPassengers[index].hotelBooking = file;
                                    setStep4Data(prev => ({ ...prev, passengers: updatedPassengers }));
                                  }}
                                  disabled={isLoading}
                                />
                                {passenger.hotelBooking && (
                                  <p className="text-xs text-green-600">✓ {passenger.hotelBooking.name}</p>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Ticket Copy *</Label>
                                <Input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    const updatedPassengers = [...step4Data.passengers];
                                    updatedPassengers[index].ticketCopy = file;
                                    setStep4Data(prev => ({ ...prev, passengers: updatedPassengers }));
                                  }}
                                  disabled={isLoading}
                                />
                                {passenger.ticketCopy && (
                                  <p className="text-xs text-green-600">✓ {passenger.ticketCopy.name}</p>
                                )}
                              </div>
                            </div>
                          );
                        }
                      } else {
                        // Regular booking document requirements (existing logic)
                        return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {passenger.isLeadPassenger && (
                          <div className="space-y-2">
                            <Label>PAN Card Photo *</Label>
                            <Input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                const updatedPassengers = [...step4Data.passengers];
                                updatedPassengers[index].panCardPhoto = file;
                                setStep4Data(prev => ({ ...prev, passengers: updatedPassengers }));
                              }}
                              disabled={isLoading}
                            />
                            {passenger.panCardPhoto && (
                              <p className="text-xs text-green-600">✓ {passenger.panCardPhoto.name}</p>
                            )}
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label>Passport Front *</Label>
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              const updatedPassengers = [...step4Data.passengers];
                              updatedPassengers[index].passportFront = file;
                              setStep4Data(prev => ({ ...prev, passengers: updatedPassengers }));
                            }}
                            disabled={isLoading}
                          />
                          {passenger.passportFront && (
                            <p className="text-xs text-green-600">✓ {passenger.passportFront.name}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Passport Back *</Label>
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              const updatedPassengers = [...step4Data.passengers];
                              updatedPassengers[index].passportBack = file;
                              setStep4Data(prev => ({ ...prev, passengers: updatedPassengers }));
                            }}
                            disabled={isLoading}
                          />
                          {passenger.passportBack && (
                            <p className="text-xs text-green-600">✓ {passenger.passportBack.name}</p>
                          )}
                        </div>
                      </div>
                        );
                      }
                    })()}
                  </div>
                </Card>
              ))}
            </div>
              </>
            )}

            {skipDocuments && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Test Mode Active:</strong> Documents will not be uploaded. This booking will be created without passenger documents.
                </p>
              </div>
            )}

            {!skipDocuments && (() => {
              const isGroupBooking = step1Data.bookingMode === 'group_number';
              
              if (isGroupBooking) {
                if (step3Data.accommodationType === 'iqama') {
                  return (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Required Documents (Group + Iqama):</strong>
                        <br />• All Passengers: Iqama Photo & PAN Card
                        <br />• Supported formats: Images (JPG, PNG) and PDF
                      </p>
                    </div>
                  );
                } else if (step3Data.accommodationType === 'hotel') {
                  return (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Required Documents (Group + Hotel):</strong>
                        <br />• All Passengers: PAN Card, Hotel Booking & Ticket Copy
                        <br />• Supported formats: Images (JPG, PNG) and PDF
                      </p>
                    </div>
                  );
                }
              } else {
                return (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Required Documents:</strong>
                  <br />• Lead Passenger: PAN Card, Passport Front & Back
                  <br />• Other Passengers: Passport Front & Back
                  <br />• Supported formats: Images (JPG, PNG) and PDF
                </p>
              </div>
                );
              }
            })()}
          </div>
        );

      default:
        return null;
    }
  };

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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col fixed h-screen">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center shadow-md">
              <Building className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{user.name}</h1>
              <p className="text-xs text-gray-500">Party Dashboard</p>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Dashboard
            </div>
            <button 
              onClick={() => router.push('/party/dashboard')}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Overview</div>
                  <div className="text-xs text-gray-500">Dashboard home</div>
                </div>
              </div>
            </button>
            
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6">
              Services
            </div>
            <div className="px-3 py-2 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center">
                  <Plane className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Umrah Visa</div>
                  <div className="text-xs text-gray-500">Apply for visa</div>
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout} 
            className="w-full border-gray-300 text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Fixed Top Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 fixed top-0 right-0 left-64 z-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Umrah Visa Application</h2>
              <p className="text-sm text-gray-600">Complete the steps below to apply for your Umrah visa</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Main Content Area */}
        <div className="flex-1 p-6 pt-24 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-sm border border-gray-100">
              <CardContent className="p-6">
                {/* Step Progress */}
                <div className="mb-8">
                  <div className="grid grid-cols-4 gap-4">
                    {steps.map((step, index) => {
                      const Icon = step.icon;
                      const isCompleted = completedSteps.includes(step.id);
                      const isCurrent = currentStep === step.id;
                      const isAccessible = step.id <= currentStep || completedSteps.includes(step.id);
                      
                      return (
                        <div key={step.id} className="flex flex-col items-center relative">
                          {/* Progress Line */}
                          {index < steps.length - 1 && (
                            <div className={`absolute top-6 left-1/2 w-full h-0.5 ${
                              completedSteps.includes(step.id) ? 'bg-red-400' : 'bg-gray-200'
                            }`} style={{ transform: 'translateX(50%)' }} />
                          )}
                          
                          <button
                            onClick={() => goToStep(step.id)}
                            disabled={!isAccessible}
                            className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all shadow-sm relative z-0 ${
                              isCompleted
                                ? 'bg-red-400 border-red-400 text-white'
                                : isCurrent
                                ? 'bg-red-500 border-red-500 text-white'
                                : isAccessible
                                ? 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                                : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="h-6 w-6" />
                            ) : (
                              <Icon className="h-6 w-6" />
                            )}
                          </button>
                          
                          <div className="mt-4 text-center px-2">
                            <p className={`text-sm font-medium mb-1 ${
                              isCurrent ? 'text-red-600' : isCompleted ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {step.title}
                            </p>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step Content */}
                <div className="mb-8">
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-red-100 to-red-200 flex items-center justify-center">
                        {React.createElement(steps[currentStep - 1].icon, { className: "h-5 w-5 text-red-600" })}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {steps[currentStep - 1].title}
                        </h3>
                        <p className="text-sm text-gray-600">{steps[currentStep - 1].description}</p>
                      </div>
                    </div>
                    {renderStepContent()}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <div className="flex space-x-3">
                    {currentStep > 1 && (
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
                      {isLoading ? 'Processing...' : currentStep < steps.length ? 'Next' : 'Submit Application'}
                      {currentStep < steps.length && <ChevronRight className="h-4 w-4 ml-2" />}
                    </Button>
                    {/* Show indicator if step has unsaved changes */}
                    {completedSteps.includes(currentStep) && hasStepDataChanged(currentStep) && (
                      <div className="flex items-center text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        <span>•</span>
                        <span className="ml-1">Unsaved changes</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Hotel Duration Coverage Dialog */}
      <Dialog open={showDurationDialog} onOpenChange={setShowDurationDialog}>
        <DialogContent className="max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Accommodation Coverage Gap</DialogTitle>
            <DialogDescription className="text-sm">
              Your travel duration is {durationDays} days, but your hotel bookings only cover {durationDays - remainingDays} days.
              You have {remainingDays} day{remainingDays > 1 ? 's' : ''} without accommodation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 flex flex-col min-h-0">
              <div className="p-3 border-b border-yellow-200 flex-shrink-0">
                <h4 className="font-medium text-yellow-800 text-sm">
                  Uncovered Dates ({uncoveredDates.length} days):
                </h4>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-1 text-xs text-yellow-700">
                  {uncoveredDates.map(date => (
                    <div key={date} className="flex items-center gap-2 py-1">
                      <span className="text-yellow-600">•</span>
                      <span>{new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <p className="text-sm text-gray-600 text-center">
                What would you like to do for these {remainingDays} day{remainingDays > 1 ? 's' : ''}?
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 flex flex-col gap-2 sm:flex-row mt-4">
            <Button 
              variant="outline" 
              onClick={handleAddHotelForRemainingDays}
              className="w-full sm:flex-1 text-sm"
            >
              <Hotel className="h-4 w-4 mr-2" />
              Add Hotel for These Days
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSkipRemainingDays}
              className="w-full sm:flex-1 text-sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Skip (Stay with Sponsor/Iqama)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
