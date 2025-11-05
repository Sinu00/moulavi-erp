// Umrah Visa Booking Validation Utilities

import { BOOKING_LIMITS, FLIGHT_NUMBER_REGEX } from './constants';
import { Step1Data, Step2Data, Step3Data, Step4Data, Passenger } from './types';

export const formatFlightNumber = (value: string): string => {
  let cleaned = value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
  cleaned = cleaned.replace(/-/g, '');
  
  const letters = cleaned.substring(0, 2).replace(/[^A-Z]/g, '');
  const numbers = cleaned.substring(2).replace(/[^0-9]/g, '').substring(0, 4);
  
  if (letters.length === 0) return '';
  if (letters.length < 2) return letters;
  if (numbers.length === 0) return letters + '-';
  return letters + '-' + numbers;
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
    if (!data.passengerCount || data.passengerCount < 1) {
      return 'Number of passengers (pax) is required and must be at least 1';
    }
    if (!data.umrahVisaProviderId) {
      return 'Umrah visa providing company is required';
    }
  }
  return null;
};

export const validateStep2 = (data: Step2Data, airports: any[]): string | null => {
  if (!data.arrivalDate || !data.arrivalTime || !data.arrivalAirportId || !data.arrivalFlightNumber) {
    return 'Please fill in all required arrival details';
  }

  if (!data.departureDate || !data.departureTime || !data.departureAirportId || !data.departureFlightNumber) {
    return 'Please fill in all required departure details';
  }

  if (!FLIGHT_NUMBER_REGEX.test(data.arrivalFlightNumber)) {
    return 'Arrival flight number must be in format: XX-1234 (2 letters, dash, 1-4 numbers)';
  }

  if (!FLIGHT_NUMBER_REGEX.test(data.departureFlightNumber)) {
    return 'Departure flight number must be in format: XX-1234';
  }

  const durationResult = calculateDuration(data.arrivalDate, data.departureDate);
  if (durationResult.error) {
    return durationResult.error;
  }

  // Hotel bookings validation for group bookings (hotels moved to Step 2)
  if (data.hotelBookings && data.hotelBookings.length > 0) {
    for (const booking of data.hotelBookings) {
      if (!booking.locationId || !booking.hotelId || !booking.checkInDate || !booking.checkOutDate) {
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

export const validateStep3 = (data: Step3Data, arrivalDate: string, departureDate: string): string | null => {
  // For group bookings: Step 3 is movement details only
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

  // Legacy validation for individual bookings (iqama/hotel in step 3)
  if (data.accommodationType === 'iqama') {
    if (!data.iqamaDetails?.iqamaNumber || !data.iqamaDetails?.iqamaName) {
      return 'Please fill in all required iqama details';
    }
  } else if (data.hotelBookings && data.hotelBookings.length > 0) {
    // Individual booking with hotels in step 3 (backward compatibility)
    for (const booking of data.hotelBookings) {
      if (!booking.locationId || !booking.hotelId || !booking.checkInDate || !booking.checkOutDate) {
        return 'Please fill in all hotel booking details';
      }
      
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      
      if (checkOut <= checkIn) {
        return 'Check-out date must be after check-in date';
      }
    }

    const coverage = calculateHotelCoverage(arrivalDate, departureDate, data.hotelBookings);
    if (coverage.remainingDays > 0) {
      return `You have ${coverage.remainingDays} day${coverage.remainingDays > 1 ? 's' : ''} without accommodation coverage`;
    }

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

  return null;
};

export const validateStep4 = (data: Step4Data, step1Data: Step1Data, step3Data: Step3Data, isGroupVisa: boolean = false): string | null => {
  // For group visa bookings (visaType: 'group_visa'), ONLY ZIP file is required
  // Note: Individual bookings can also have group numbers, so we check visaType, not hasGroupNumber
  if (isGroupVisa) {
    const zipFile = (data as any).panCardZipFile;
    if (!zipFile) {
      return 'Please upload a ZIP file containing all PAN cards for the group';
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
    
    return null; // All validations passed for group bookings
  }

  // For individual bookings (without group number): validate passengers and documents
  const passengerCount = data.passengers.length;
  const accommodationType = step3Data.accommodationType || 'hotel';
  
  if (passengerCount < 1) {
    return 'At least one passenger is required';
  }
  
  if (accommodationType === 'iqama' && passengerCount > BOOKING_LIMITS.MAX_PASSENGERS_IQAMA) {
    return `Maximum ${BOOKING_LIMITS.MAX_PASSENGERS_IQAMA} passengers allowed for iqama accommodation`;
  }

  const leadPassengers = data.passengers.filter(p => p.isLeadPassenger);
  if (leadPassengers.length !== 1) {
    return 'Exactly one lead passenger is required';
  }

  // Validate passenger names
  for (const passenger of data.passengers) {
    if (!passenger.fullName.trim()) {
      return 'All passengers must have a full name';
    }
  }

  // Individual booking WITHOUT group number: All passengers need passport, lead needs PAN
  for (const passenger of data.passengers) {
    if (!passenger.passportFront) {
      return `Passport front is required for ${passenger.fullName || 'passenger'}`;
    }
    if (!passenger.passportBack) {
      return `Passport back is required for ${passenger.fullName || 'passenger'}`;
    }

    if (passenger.isLeadPassenger && !passenger.panCardPhoto) {
      return 'Lead passenger PAN card is required';
    }
  }

  // Individual booking WITH group number (legacy): Check accommodation type
  if (step1Data.groupNumber && step3Data.accommodationType) {
    const leadPassenger = data.passengers.find(p => p.isLeadPassenger);
    if (!leadPassenger) {
      return 'Lead passenger not found';
    }

    if (step3Data.accommodationType === 'hotel') {
      if (!leadPassenger.ticketCopy) {
        return 'Ticket copy is required for lead passenger';
      }
      if (!leadPassenger.hotelBooking) {
        return 'Hotel copy is required for lead passenger';
      }
    } else if (step3Data.accommodationType === 'iqama') {
      if (!leadPassenger.iqamaPhoto) {
        return 'Iqama copy is required for lead passenger';
      }
    }
  }

  return null;
};
