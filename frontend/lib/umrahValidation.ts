import * as z from 'zod';
import { VALIDATION_RULES, requiresTransport, isJeddahRoute } from './umrahConstants';

// Step 1: Booking Mode Selection
export const bookingModeSchema = z.object({
  bookingMode: z.enum(['group_number', 'travel_documents'], {
    required_error: 'Please select a booking mode'
  })
});

// Step 2: Group & Flight Details
export const groupFlightDetailsSchema = z.object({
  groupNumber: z.string().optional(),
  groupName: z.string().optional(),
  flightNumber: z.string().min(1, 'Flight number is required'),
  arrivalDate: z.string().min(1, 'Arrival date is required'),
  departureDate: z.string().min(1, 'Departure date is required'),
  arrivalAirport: z.string().min(1, 'Please select arrival airport/route')
}).refine((data) => {
  // Validate travel dates
  const arrival = new Date(data.arrivalDate);
  const departure = new Date(data.departureDate);
  const diffTime = departure.getTime() - arrival.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= VALIDATION_RULES.MAX_TRAVEL_DAYS && diffDays > 0;
}, {
  message: `Travel duration cannot exceed ${VALIDATION_RULES.MAX_TRAVEL_DAYS} days`,
  path: ['departureDate']
});

// Step 3: Transport Details (conditional)
export const transportDetailsSchema = z.object({
  transportRoute: z.string().optional(),
  transportType: z.string().optional(),
  transportPax: z.number().optional()
}).refine((data) => {
  // Only validate if transport is required
  return true; // Will be validated dynamically based on route
}, {
  message: 'Transport details are required for Jeddah routes',
  path: ['transportType']
});

// Step 4: Accommodation Selection
export const accommodationSchema = z.object({
  accommodationType: z.enum(['hotel', 'iqama'], {
    required_error: 'Please select accommodation type'
  }),
  makkahCheckIn: z.string().optional(),
  makkahCheckOut: z.string().optional(),
  madinaCheckIn: z.string().optional(),
  madinaCheckOut: z.string().optional(),
  iqamaNumber: z.string().optional(),
  iqamaName: z.string().optional(),
  iqamaDob: z.string().optional(),
  iqamaMobile: z.string().optional()
}).refine((data) => {
  if (data.accommodationType === 'hotel') {
    return data.makkahCheckIn && data.makkahCheckOut && 
           data.madinaCheckIn && data.madinaCheckOut;
  } else if (data.accommodationType === 'iqama') {
    return data.iqamaNumber && data.iqamaName && 
           data.iqamaDob && data.iqamaMobile;
  }
  return true;
}, {
  message: 'Please fill all required accommodation details',
  path: ['accommodationType']
});

// Step 5: Passenger Details
export const passengerSchema = z.object({
  isLeadPassenger: z.boolean().default(false),
  fullName: z.string().min(1, 'Full name is required'),
  passportNumber: z.string().min(1, 'Passport number is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  passportExpiry: z.string().min(1, 'Passport expiry date is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female'], {
    required_error: 'Please select gender'
  }),
  phoneNumber: z.string().optional()
});

export const passengersSchema = z.object({
  passengerCount: z.number().min(1, 'At least 1 passenger is required')
    .max(VALIDATION_RULES.MAX_PASSENGERS, `Maximum ${VALIDATION_RULES.MAX_PASSENGERS} passengers allowed`),
  passengers: z.array(passengerSchema).min(1, 'At least 1 passenger is required')
}).refine((data) => {
  return data.passengers.length === data.passengerCount;
}, {
  message: 'Passengers array length must match passenger count',
  path: ['passengers']
}).refine((data) => {
  const leadPassengers = data.passengers.filter(p => p.isLeadPassenger);
  return leadPassengers.length === 1;
}, {
  message: 'Exactly one lead passenger is required',
  path: ['passengers']
});

// Complete booking schema
export const umrahVisaBookingSchema = z.object({
  // Step 1
  bookingMode: z.enum(['group_number', 'travel_documents']),
  
  // Step 2
  groupNumber: z.string().optional(),
  groupName: z.string().optional(),
  flightNumber: z.string().min(1, 'Flight number is required'),
  arrivalDate: z.string().min(1, 'Arrival date is required'),
  departureDate: z.string().min(1, 'Departure date is required'),
  arrivalAirport: z.string().min(1, 'Please select arrival airport/route'),
  
  // Step 3
  transportType: z.string().optional(),
  transportPax: z.number().optional(),
  transportPrice: z.number().optional(),
  
  // Step 4
  accommodationType: z.enum(['hotel', 'iqama']),
  makkahCheckIn: z.string().optional(),
  makkahCheckOut: z.string().optional(),
  madinaCheckIn: z.string().optional(),
  madinaCheckOut: z.string().optional(),
  iqamaNumber: z.string().optional(),
  iqamaName: z.string().optional(),
  iqamaDob: z.string().optional(),
  iqamaMobile: z.string().optional(),
  
  // Step 5
  passengerCount: z.number().min(1).max(VALIDATION_RULES.MAX_PASSENGERS),
  passengers: z.array(passengerSchema).min(1)
}).refine((data) => {
  // Validate group number requirements
  if (data.bookingMode === 'group_number') {
    return data.groupNumber && data.groupName;
  }
  return true;
}, {
  message: 'Group number and group name are required for group booking mode',
  path: ['groupNumber']
}).refine((data) => {
  // Validate travel dates
  const arrival = new Date(data.arrivalDate);
  const departure = new Date(data.departureDate);
  const diffTime = departure.getTime() - arrival.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= VALIDATION_RULES.MAX_TRAVEL_DAYS && diffDays > 0;
}, {
  message: `Travel duration cannot exceed ${VALIDATION_RULES.MAX_TRAVEL_DAYS} days`,
  path: ['departureDate']
}).refine((data) => {
  // Validate transport requirements for Jeddah routes only
  if (isJeddahRoute(data.arrivalAirport)) {
    return data.transportType && data.transportPax;
  }
  return true;
}, {
  message: 'Transport details are required for Jeddah routes',
  path: ['transportType']
}).refine((data) => {
  // Validate passenger count based on accommodation type
  if (data.accommodationType === 'iqama' && data.passengerCount > VALIDATION_RULES.MAX_PASSENGERS_IQAMA) {
    return false;
  }
  return true;
}, {
  message: `Maximum ${VALIDATION_RULES.MAX_PASSENGERS_IQAMA} passengers allowed for iqama accommodation`,
  path: ['passengerCount']
}).refine((data) => {
  // Validate accommodation type specific requirements
  if (data.accommodationType === 'hotel') {
    return data.makkahCheckIn && data.makkahCheckOut && 
           data.madinaCheckIn && data.madinaCheckOut;
  } else if (data.accommodationType === 'iqama') {
    return data.iqamaNumber && data.iqamaName && 
           data.iqamaDob && data.iqamaMobile;
  }
  return true;
}, {
  message: 'Please fill all required accommodation details',
  path: ['accommodationType']
}).refine((data) => {
  // Validate passengers array length
  return data.passengers.length === data.passengerCount;
}, {
  message: 'Passengers array length must match passenger count',
  path: ['passengers']
}).refine((data) => {
  // Validate only one lead passenger
  const leadPassengers = data.passengers.filter(p => p.isLeadPassenger);
  return leadPassengers.length === 1;
}, {
  message: 'Exactly one lead passenger is required',
  path: ['passengers']
});

// Type inference
export type BookingModeFormData = z.infer<typeof bookingModeSchema>;
export type GroupFlightDetailsFormData = z.infer<typeof groupFlightDetailsSchema>;
export type TransportDetailsFormData = z.infer<typeof transportDetailsSchema>;
export type AccommodationFormData = z.infer<typeof accommodationSchema>;
export type PassengersFormData = z.infer<typeof passengersSchema>;
export type UmrahVisaBookingFormData = z.infer<typeof umrahVisaBookingSchema>;
export type PassengerFormData = z.infer<typeof passengerSchema>;

// Dynamic validation helpers
export function validateStep1(data: Partial<BookingModeFormData>) {
  return bookingModeSchema.safeParse(data);
}

export function validateStep2(data: Partial<GroupFlightDetailsFormData>, bookingMode?: string) {
  const schema = groupFlightDetailsSchema.refine((data) => {
    if (bookingMode === 'group_number') {
      return data.groupNumber && data.groupName;
    }
    return true;
  }, {
    message: 'Group number and group name are required for group booking mode',
    path: ['groupNumber']
  });
  
  return schema.safeParse(data);
}

export function validateStep3(data: Partial<TransportDetailsFormData>, arrivalAirport?: string) {
  const schema = transportDetailsSchema.refine((data) => {
    if (arrivalAirport && isJeddahRoute(arrivalAirport)) {
      return data.transportRoute && data.transportType && data.transportPax;
    }
    return true;
  }, {
    message: 'Transport details are required for Jeddah routes',
    path: ['transportType']
  });
  
  return schema.safeParse(data);
}

export function validateStep4(data: Partial<AccommodationFormData>) {
  return accommodationSchema.safeParse(data);
}

export function validateStep5(data: Partial<PassengersFormData>, accommodationType?: string) {
  const schema = passengersSchema.refine((data) => {
    if (accommodationType === 'iqama' && data.passengerCount > VALIDATION_RULES.MAX_PASSENGERS_IQAMA) {
      return false;
    }
    return true;
  }, {
    message: `Maximum ${VALIDATION_RULES.MAX_PASSENGERS_IQAMA} passengers allowed for iqama accommodation`,
    path: ['passengerCount']
  });
  
  return schema.safeParse(data);
}
