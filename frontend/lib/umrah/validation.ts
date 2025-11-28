// Umrah Visa Booking Validation Utilities

import { BOOKING_LIMITS, FLIGHT_NUMBER_REGEX } from './constants';
import { Step1Data, Step2Data, Step3Data, Step4Data, Step5Data, Passenger } from './types';

export const formatFlightNumber = (value: string): string => {
  // Remove all invalid characters and convert to uppercase
  let cleaned = value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
  
  // Split by dash if present, otherwise treat as single string
  const parts = cleaned.split('-');
  
  if (parts.length === 1) {
    // No dash found, format as we type
    const allChars = parts[0];
    if (allChars.length === 0) return '';
    if (allChars.length <= 2) return allChars;
    // First 2 chars, then dash, then up to 4 more chars
    const firstPart = allChars.substring(0, 2);
    const secondPart = allChars.substring(2, 6); // Max 4 chars
    return secondPart.length > 0 ? `${firstPart}-${secondPart}` : `${firstPart}-`;
  } else {
    // Dash found, format both parts
    const firstPart = parts[0].substring(0, 2).replace(/[^A-Z0-9]/g, '');
    const secondPart = parts.slice(1).join('').substring(0, 4).replace(/[^A-Z0-9]/g, '');
    
    if (firstPart.length === 0) return '';
    if (firstPart.length < 2) return firstPart + (secondPart.length > 0 ? '-' + secondPart : '-');
    return secondPart.length > 0 ? `${firstPart}-${secondPart}` : `${firstPart}-`;
  }
};

export const calculateDuration = (arrival: string, departure: string) => {
  if (!arrival || !departure) return { days: 0, error: '' };

  const arrivalDate = new Date(arrival);
  const departureDate = new Date(departure);
  
  if (departureDate <= arrivalDate) {
    return { days: 0, error: 'Departure date must be after arrival date' };
  }
  
  const diffTime = departureDate.getTime() - arrivalDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > BOOKING_LIMITS.MAX_TRAVEL_DAYS) {
    return { 
      days: diffDays, 
      error: `Travel duration (${diffDays} days) exceeds the maximum limit of ${BOOKING_LIMITS.MAX_TRAVEL_DAYS} days` 
    };
  }
  
  return { days: diffDays, error: '' };
};

export const calculateHotelCoverage = (arrivalDate: string, departureDate: string, hotelBookings: any[]) => {
  if (!arrivalDate || !departureDate || !hotelBookings) {
    return { totalCovered: 0, uncoveredDates: [], remainingDays: 0 };
  }

  const arrival = new Date(arrivalDate);
  const departure = new Date(departureDate);
  const allDates: string[] = [];
  
  const currentDate = new Date(arrival);
  while (currentDate < departure) {
    allDates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const coveredDates = new Set<string>();
  hotelBookings.forEach(booking => {
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

  const uncoveredDates = allDates.filter(date => !coveredDates.has(date));
  
  return {
    totalCovered: coveredDates.size,
    uncoveredDates,
    remainingDays: uncoveredDates.length
  };
};

export const validateStep1 = (data: Step1Data): string | null => {
  if (data.bookingMode === 'group_number') {
    if (!data.groupNumber?.trim()) {
      return 'Group number is required for group booking mode';
    }
    if (!data.groupName?.trim()) {
      return 'Group name is required for group booking mode';
    }
    if (!data.umrahVisaProviderId) {
      return 'Umrah visa providing company is required';
    }
  }
  return null;
};

export const validateStep2 = (data: Step2Data, airports: any[], step1Data?: Step1Data): string | null => {
  if (!data.arrivalDate || !data.arrivalTime || !data.arrivalAirportId || !data.arrivalFlightNumber) {
    return 'Please fill in all required arrival details';
  }

  if (!data.departureDate || !data.departureTime || !data.departureAirportId || !data.departureFlightNumber) {
    return 'Please fill in all required departure details';
  }

  // Passenger count is required in Step 2 for both individual and group bookings
  if (!data.passengerCount || data.passengerCount < 1) {
    return 'Number of passengers (pax) is required and must be at least 1';
  }

  if (!FLIGHT_NUMBER_REGEX.test(data.arrivalFlightNumber)) {
    return 'Arrival flight number must be in format: XX-XXXX (2 alphanumeric, dash, 1-4 alphanumeric)';
  }

  if (!FLIGHT_NUMBER_REGEX.test(data.departureFlightNumber)) {
    return 'Departure flight number must be in format: XX-XXXX (2 alphanumeric, dash, 1-4 alphanumeric)';
  }

  const durationResult = calculateDuration(data.arrivalDate, data.departureDate);
  if (durationResult.error) {
    return durationResult.error;
  }

  // Hotel bookings validation for group bookings (hotels moved to Step 2)
  if (data.hotelBookings && data.hotelBookings.length > 0) {
    for (const booking of data.hotelBookings) {
      if (!booking.cityId || !booking.hotelId || !booking.checkInDate || !booking.checkOutDate) {
        return 'Please fill in all hotel booking details';
      }
      
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      
      if (checkOut <= checkIn) {
        return 'Check-out date must be after check-in date';
      }
    }

    const coverage = calculateHotelCoverage(data.arrivalDate, data.departureDate, data.hotelBookings);
    if (coverage.remainingDays > 0) {
      return `You have ${coverage.remainingDays} day${coverage.remainingDays > 1 ? 's' : ''} without accommodation coverage`;
    }
  }

  return null;
};

export const validateStep3 = (data: Step3Data, arrivalDate: string, departureDate: string, step2Data?: { passengerCount?: number }): string | null => {
  // Check if this is an individual booking (has accommodationType) or group booking (has transportSegments)
  const isIndividualBooking = !!data.accommodationType;
  const isGroupBooking = !isIndividualBooking && data.transportSegments !== undefined;

  // For group bookings: Step 3 is movement details only
  if (isGroupBooking) {
    // Validate transport segments (manual movement)
    if (!data.transportSegments || data.transportSegments.length === 0) {
      return 'Please add movement segments';
    }

    // Validate transport segments
    for (const segment of data.transportSegments) {
      if (!segment.fromLocationId || !segment.toLocationId) {
        return 'Please fill in from and to locations for all movement segments';
      }
      if (!segment.travelDate) {
        return 'Travel date is required for all movement segments';
      }
    }
    return null; // Group booking validation complete
  }

  // For individual bookings: Step 3 is accommodation details only (no movement segments needed)
  if (isIndividualBooking) {
    if (data.accommodationType === 'iqama') {
      // Validate passenger count for iqama (max 5)
      const passengerCount = step2Data?.passengerCount;
      if (passengerCount && passengerCount > 5) {
        return `Iqama accommodation is only allowed for up to 5 passengers. You have ${passengerCount} passengers.`;
      }
      
      if (!data.iqamaDetails?.iqamaNumber || !data.iqamaDetails?.iqamaName) {
        return 'Please fill in all required iqama details';
      }
      if (!data.iqamaDetails?.iqamaNationalShortAddress?.trim()) {
        return 'National short address is required for iqama accommodation';
      }
    } else if (data.hotelBookings && data.hotelBookings.length > 0) {
      // Individual booking with hotels in step 3 (backward compatibility)
      for (const booking of data.hotelBookings) {
        if (!booking.cityId || !booking.hotelId || !booking.checkInDate || !booking.checkOutDate) {
          return 'Please fill in all hotel booking details';
        }
        
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        
        if (checkOut <= checkIn) {
          return 'Check-out date must be after check-in date';
        }
      }

      // Note: Hotel coverage validation (all days covered) is NOT required for individual bookings
      // Individual bookings don't need to cover all days between arrival and departure

      // Ziyarah basic validations
      if (data.ziyarah && data.ziyarah.length) {
        for (const z of data.ziyarah) {
          if (!z.date) continue;
          const d = new Date(z.date + 'T00:00:00');
          // 5 = Friday when using getUTCDay with date-only baseline
          if (d.getUTCDay() === 5) {
            return `${z.city} Ziyarah cannot be scheduled on Friday. Please adjust the date.`;
          }
          if (departureDate && z.date === departureDate) {
            return `${z.city} Ziyarah collides with departure date. Please choose another day.`;
          }
        }
      }
    }
  }

  return null;
};

export const validateStep4 = (
  data: Step4Data, 
  step1Data?: Step1Data, 
  step2Data?: Step2Data, 
  step3Data?: Step3Data,
  locationMasters?: any[]
): string | null => {
  // Step 4: Transport Vehicle Selection
  // Transport is optional unless: arrivalAirport is Jeddah AND accommodationType is hotel
  
  // Check if transport is required
  const isTransportRequired = (() => {
    if (!step2Data?.arrivalAirportId || !step3Data?.accommodationType) {
      return false;
    }
    
    // Check if arrival airport is Jeddah
    const arrivalAirport = locationMasters?.find(
      (lm) => lm.id === step2Data.arrivalAirportId && lm.locationType === 'AIRPORT'
    );
    
    const isJeddah = arrivalAirport && (
      arrivalAirport.code === 'JED' || 
      arrivalAirport.name?.toLowerCase().includes('jeddah')
    );
    
    return isJeddah && step3Data.accommodationType === 'hotel';
  })();
  
  // Check if we have either single or multiple transport selection
  const hasSingleTransport = !!data.selectedTransport;
  const hasMultipleTransports = !!(data.selectedTransports && data.selectedTransports.length > 0);
  
  // If transport is required, validate it
  if (isTransportRequired) {
    if (!hasSingleTransport && !hasMultipleTransports) {
      return 'Please select a transport vehicle for your route (required for Jeddah arrival with hotel accommodation)';
    }
  }
  
  // Validate single transport if provided
  if (hasSingleTransport && data.selectedTransport) {
    if (!data.selectedTransport.routeId || !data.selectedTransport.transportId || !data.selectedTransport.vehicleTypeId) {
      return 'Invalid transport selection. Please select again.';
    }
  }
  
  // Validate multiple transports if provided (for fulltrip routes)
  if (hasMultipleTransports) {
    if (!data.selectedTransports || data.selectedTransports.length === 0) {
      return 'Please select at least one vehicle for your route.';
    }
    
    // Validate each transport in the array
    for (const transport of data.selectedTransports) {
      if (!transport.routeId || !transport.transportId || !transport.vehicleTypeId || !transport.price) {
        return 'Invalid transport selection. Please select again.';
      }
      if (!transport.quantity || transport.quantity < 1) {
        return 'Each selected vehicle must have a quantity of at least 1.';
      }
    }
    
    // Check if total capacity meets passenger count
    if (step2Data?.passengerCount) {
      const totalCapacity = data.selectedTransports.reduce((sum, t) => {
        // We need to get the vehicle type capacity, but we don't have it here
        // This will be validated in the component itself
        return sum;
      }, 0);
      
      // Note: Capacity validation is done in the UI component
      // We just validate the structure here
    }
  }
  
  return null;
};

export const validateStep5 = (data: Step5Data, step1Data: Step1Data, step3Data: Step3Data, isGroupVisa: boolean = false): string | null => {
  // For both group and individual bookings: ONLY ZIP file is required
  const zipFile = data.panCardZipFile;
  if (!zipFile) {
    return 'Please upload a ZIP file containing all required documents';
  }

  // Validate ZIP file type
  const isValidZip = zipFile.type === 'application/zip' || zipFile.name.toLowerCase().endsWith('.zip');
  if (!isValidZip) {
    return 'Please upload a valid ZIP file (.zip)';
  }

  // Validate ZIP file size (max 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (zipFile.size > maxSize) {
    return 'ZIP file size exceeds 50MB limit. Please compress your files.';
  }
  
  return null; // All validations passed
};
