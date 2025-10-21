// Umrah Visa Booking Validation Utilities

import { BOOKING_LIMITS, FLIGHT_NUMBER_REGEX, BOOKING_RULES } from './constants';
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

  const selectedAirport = airports.find(a => a.id === data.arrivalAirportId);
  if (selectedAirport && ['JED', 'MED'].includes(selectedAirport.airportCode)) {
    if (!data.transportBookings || data.transportBookings.length === 0) {
      return 'Transport selection is required for Jeddah/Medina airports';
    }
  }

  return null;
};

export const validateStep3 = (data: Step3Data, arrivalDate: string, departureDate: string): string | null => {
  if (data.accommodationType === 'iqama') {
    if (!data.iqamaDetails?.iqamaNumber || !data.iqamaDetails?.iqamaName) {
      return 'Please fill in all required iqama details';
    }
  } else {
    if (!data.hotelBookings || data.hotelBookings.length === 0) {
      return 'Please add at least one hotel booking';
    }
    
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
  }
  return null;
};

export const validateStep4 = (data: Step4Data, step1Data: Step1Data, step3Data: Step3Data, skipDocuments: boolean): string | null => {
  const isGroupBooking = step1Data.bookingMode === 'group_number';
  
  if (isGroupBooking) {
    // Group booking validation (matches backend - no document validation in dev mode)
    if (!step1Data.groupName?.trim()) {
      return 'Group name is required';
    }

    const passengerCount = data.passengers.length;
    if (passengerCount < 1 || passengerCount > 50) {
      return 'Passenger count must be between 1 and 50';
    }

    const leadPassengers = data.passengers.filter(p => p.isLeadPassenger);
    if (leadPassengers.length !== 1) {
      return 'Exactly one lead passenger is required';
    }

    for (const passenger of data.passengers) {
      if (!passenger.fullName.trim()) {
        return 'All passengers must have a full name';
      }
    }

    // Group bookings skip document validation in development mode (matches backend)
    return null;
  } else {
    // Individual booking validation (matches backend - requires documents)
    const passengerCount = data.passengers.length;
    
    if (step3Data.accommodationType === 'iqama' && passengerCount > BOOKING_LIMITS.MAX_PASSENGERS_IQAMA) {
      return `Maximum ${BOOKING_LIMITS.MAX_PASSENGERS_IQAMA} passengers allowed for iqama accommodation`;
    }

    if (passengerCount < 1) {
      return 'At least one passenger is required';
    }

    const leadPassengers = data.passengers.filter(p => p.isLeadPassenger);
    if (leadPassengers.length !== 1) {
      return 'Exactly one lead passenger is required';
    }

    for (const passenger of data.passengers) {
      if (!passenger.fullName.trim()) {
        return 'All passengers must have a full name';
      }
      
      // Document validation only if not in skip mode
      if (!skipDocuments) {
        if (passenger.isLeadPassenger) {
          // Lead passenger requirements (matches backend)
          if (!passenger.panCardPhoto) {
            return 'Lead passenger PAN card photo is required';
          }
          if (!passenger.passportFront) {
            return 'Lead passenger passport front is required';
          }
          if (!passenger.passportBack) {
            return 'Lead passenger passport back is required';
          }
          
          // Conditional documents for lead passenger
          if (step3Data.accommodationType === 'iqama' && !passenger.iqamaPhoto) {
            return 'Iqama photo is required for iqama accommodation';
          }
          if (step3Data.accommodationType === 'hotel' && !passenger.hotelBooking) {
            return 'Hotel booking document is required for hotel accommodation';
          }
          if (step3Data.accommodationType === 'hotel' && !passenger.ticketCopy) {
            return 'Ticket copy is required for hotel accommodation';
          }
        } else {
          // Other passengers requirements (matches backend)
          if (!passenger.passportFront) {
            return `Passport front is required for ${passenger.fullName}`;
          }
          if (!passenger.passportBack) {
            return `Passport back is required for ${passenger.fullName}`;
          }
        }
      }
    }
  }

  return null;
};
