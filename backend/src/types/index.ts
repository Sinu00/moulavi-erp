import { Request } from 'express';
import { 
  User, 
  Party, 
  Service, 
  Document, 
  RefreshToken,
  TransportMaster,
  CountryMaster,
  CurrencyMaster,
  DestinationMaster,
  HotelMaster,
  ServiceTypeMaster,
  UserRoleMaster,
  AirportRouteMaster,
  UserRole,
  CustomerType,
  AccountCurrency,
  ServiceStatus,
  UmrahVisaStatus,
  Gender
} from '@prisma/client';

// Re-export Prisma types for convenience
export type { 
  User, 
  Party, 
  Service, 
  Document, 
  RefreshToken,
  TransportMaster,
  CountryMaster,
  CurrencyMaster,
  DestinationMaster,
  HotelMaster,
  ServiceTypeMaster,
  UserRoleMaster,
  AirportRouteMaster,
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

// Umrah Visa Booking Types
export type BookingMode = 'group_number' | 'travel_documents';
export type AccommodationType = 'hotel' | 'iqama';

export interface CreateUmrahVisaBookingRequest {
  party_id: string;
  booking_mode: BookingMode;
  group_number?: string;
  group_name?: string;
  flight_number: string;
  arrival_date: string;
  departure_date: string;
  arrival_airport: string;
  transport_route?: string;
  transport_type?: string;
  transport_pax?: number;
  transport_price?: number;
  accommodation_type: AccommodationType;
  makkah_checkin?: string;
  makkah_checkout?: string;
  madina_checkin?: string;
  madina_checkout?: string;
  iqama_number?: string;
  iqama_name?: string;
  iqama_dob?: string;
  iqama_mobile?: string;
  passenger_count: number;
  passengers: CreateUmrahPassengerRequest[];
}

export interface CreateUmrahPassengerRequest {
  is_lead_passenger: boolean;
  full_name: string;
  passport_number: string;
  nationality: string;
  passport_expiry: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  phone_number?: string;
}

export interface TransportPricingRequest {
  route: string;
  transport_type: string;
  pax: number;
}

export interface TransportPricingResponse {
  route: string;
  transport_type: string;
  pax: number;
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

// Transport Master Types
export interface CreateTransportMasterRequest {
  vehicleRoute: string;
  vehicleType: string;
  pax: number;
  price: number;
}

export interface UpdateTransportMasterRequest {
  vehicleRoute?: string;
  vehicleType?: string;
  pax?: number;
  price?: number;
  isActive?: boolean;
}

// Country Master Types
export interface CreateCountryMasterRequest {
  countryCode: string;
  countryName: string;
  nationality: string;
}

export interface UpdateCountryMasterRequest {
  countryCode?: string;
  countryName?: string;
  nationality?: string;
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

// Destination Master Types
export interface CreateDestinationMasterRequest {
  destinationCode: string;
  destinationName: string;
  city: string;
  country: string;
  description?: string;
}

export interface UpdateDestinationMasterRequest {
  destinationCode?: string;
  destinationName?: string;
  city?: string;
  country?: string;
  description?: string;
  isActive?: boolean;
}

// Hotel Master Types
export interface CreateHotelMasterRequest {
  hotelCode: string;
  hotelName: string;
  destinationId: string;
  category: string;
  capacity: number;
  amenities?: string[];
  description?: string;
}

export interface UpdateHotelMasterRequest {
  hotelCode?: string;
  hotelName?: string;
  destinationId?: string;
  category?: string;
  capacity?: number;
  amenities?: string[];
  description?: string;
  isActive?: boolean;
}

// Service Type Master Types
export interface CreateServiceTypeMasterRequest {
  serviceCode: string;
  serviceName: string;
  category: string;
  description?: string;
}

export interface UpdateServiceTypeMasterRequest {
  serviceCode?: string;
  serviceName?: string;
  category?: string;
  description?: string;
  isActive?: boolean;
}

// User Role Master Types
export interface CreateUserRoleMasterRequest {
  roleCode: string;
  roleName: string;
  permissions: string[];
  description?: string;
}

export interface UpdateUserRoleMasterRequest {
  roleCode?: string;
  roleName?: string;
  permissions?: string[];
  description?: string;
  isActive?: boolean;
}

// Airport Route Master Types
export interface CreateAirportRouteMasterRequest {
  routeCode: string;
  routeName: string;
  fromAirport: string;
  toAirport: string;
  fromDestinationId?: string;
  toDestinationId?: string;
  description?: string;
}

export interface UpdateAirportRouteMasterRequest {
  routeCode?: string;
  routeName?: string;
  fromAirport?: string;
  toAirport?: string;
  fromDestinationId?: string;
  toDestinationId?: string;
  description?: string;
  isActive?: boolean;
}

// Destination Master Types
export interface CreateDestinationMasterRequest {
  destinationCode: string;
  destinationName: string;
  city: string;
  country: string;
  description?: string;
}

export interface UpdateDestinationMasterRequest {
  destinationCode?: string;
  destinationName?: string;
  city?: string;
  country?: string;
  description?: string;
  isActive?: boolean;
}

