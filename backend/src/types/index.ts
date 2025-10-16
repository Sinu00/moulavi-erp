import { Request } from 'express';
import { 
  User, 
  Party, 
  Service, 
  Document, 
  RefreshToken,
  TransportMaster,
  CurrencyMaster,
  DestinationMaster,
  HotelMaster,
  UserRole,
  CustomerType,
  AccountCurrency,
  ServiceStatus,
  UmrahVisaStatus,
  Gender
} from '@prisma/client';

// Re-export Prisma types for convenience (Updated for cleanup)
export type { 
  User, 
  Party, 
  Service, 
  Document, 
  RefreshToken,
  TransportMaster,
  CurrencyMaster,
  DestinationMaster,
  HotelMaster,
  UserRole,
  CustomerType,
  AccountCurrency,
  ServiceStatus,
  UmrahVisaStatus,
  Gender
};


export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

// Umrah Visa Booking Types (New Step-by-Step Workflow)
export type AccommodationType = 'hotel' | 'iqama';

// Step 1: Group Details + Basic Info
export interface Step1Data {
  hasGroupNumber: boolean;
  groupNumber?: string;
  groupName?: string;
  passengerCount: number;
}

// Step 2: Travel Details (Both arrival and departure required)
export interface Step2Data {
  arrivalDate: string;
  arrivalAirportId: string;
  arrivalFlightNumber: string;
  departureDate: string;
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

// Step 3: Accommodation Details (Simplified - no roomCount/guestCount)
export interface Step3Data {
  accommodationType: AccommodationType;
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

// Step 4: Passenger Details (Simplified)
export interface Step4Data {
  passengers: Array<{
    fullName: string;
    isLeadPassenger: boolean;
  }>;
}

// Transport Pricing Types (Updated)
export interface TransportPricingRequest {
  route: string;
  vehicleType: string;
  paxCount: number;
}

export interface TransportPricingResponse {
  route: string;
  vehicleType: string;
  paxCount: number;
  price: number;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
}

// User Management Types
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  is_active?: boolean;
}

// Transport Master Types (Updated - paxCount instead of pax)
export interface CreateTransportMasterRequest {
  fromLocationId: string;
  toLocationId: string;
  vehicleType: string;
  paxCount: number;
  price: number;
  isActive?: boolean;
}

export interface UpdateTransportMasterRequest {
  fromLocationId?: string;
  toLocationId?: string;
  vehicleType?: string;
  paxCount?: number;
  price?: number;
  isActive?: boolean;
}

// Currency Master Types
export interface CreateCurrencyMasterRequest {
  currencyCode: string;
  currencyName: string;
  symbol: string;
}

export interface UpdateCurrencyMasterRequest {
  currencyCode?: string;
  currencyName?: string;
  symbol?: string;
  isActive?: boolean;
}

// Destination Master Types (Simplified - removed description)
export interface CreateDestinationMasterRequest {
  destinationCode: string;
  destinationName: string;
  city: string;
  country: string;
  isActive?: boolean;
}

export interface UpdateDestinationMasterRequest {
  destinationCode?: string;
  destinationName?: string;
  city?: string;
  country?: string;
  isActive?: boolean;
}

// Hotel Master Types (Simplified - removed category, capacity, amenities, description)
export interface CreateHotelMasterRequest {
  hotelCode: string;
  hotelName: string;
  locationId: string;
  isActive?: boolean;
}

export interface UpdateHotelMasterRequest {
  hotelCode?: string;
  hotelName?: string;
  locationId?: string;
  isActive?: boolean;
}

// Umrah Visa Booking Request Types
export interface CreateUmrahVisaBookingRequest {
  serviceId: string;
  groupNumber?: string;
  groupName?: string;
  passengerCount: number;
  accommodationType?: AccommodationType;
  travelDetails?: {
    arrivalDate: string;
    arrivalTime: string;
    arrivalAirportId: string;
    arrivalFlightNumber: string;
    departureDate: string;
    departureTime: string;
    departureAirportId: string;
    departureFlightNumber: string;
  };
  accommodationDetails?: {
    iqamaNumber?: string;
    iqamaName?: string;
    iqamaDob?: string;
    iqamaMobile?: string;
    iqamaNationalShortAddress?: string;
    hotelBookings?: Array<{
      locationId: string;
      hotelId: string;
      checkInDate: string;
      checkOutDate: string;
    }>;
  };
  transportBookings?: Array<{
    fromLocationId: string;
    toLocationId: string;
    vehicleType: string;
    paxCount: number;
    price: number;
    travelDate?: string;
  }>;
  passengers?: Array<{
    fullName: string;
    isLeadPassenger: boolean;
  }>;
}


