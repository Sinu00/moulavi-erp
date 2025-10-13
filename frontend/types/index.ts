// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'party';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// User Management Types (using existing User model)
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'staff' | 'party';
  is_active?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'staff' | 'party';
  is_active?: boolean;
}

// Party Types
export interface Party {
  id: string;
  partyName: string;
  email: string;
  contactNumber?: string;
  whatsappNumber?: string;
  address?: string;
  gstNumber?: string;
  customerType: 'direct' | 'b2b';
  accountCurrency: 'SAR' | 'INR' | 'AED';
  isSupplier: boolean;
  isCustomer: boolean;
  loginRequired: boolean;
  userId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartyRequest {
  party_name: string;
  email: string;
  contact_number?: string;
  whatsapp_number?: string;
  address?: string;
  gst_number?: string;
  customer_type: 'direct' | 'b2b';
  account_currency: 'SAR' | 'INR' | 'AED';
  is_supplier?: boolean;
  is_customer?: boolean;
  login_required?: boolean;
}

// Service Types
export interface Service {
  id: string;
  serviceType: string;
  partyId: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  submittedAt: string;
  details: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Additional fields for party services
  umrahVisaStatus?: 'pending' | 'processing' | 'approved' | 'rejected' | 'completed';
  umrahVisaDetail?: UmrahVisaDetails | null;
  documents?: Document[];
}

export interface UmrahVisaDetails {
  id?: string;
  serviceId?: string;
  fullName: string;
  passportNumber: string;
  nationality: string;
  travelDateFrom: string;
  travelDateTo: string;
  passportExpiry: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  phoneNumber?: string;
  status?: 'pending' | 'processing' | 'approved' | 'rejected' | 'completed';
  partyName?: string;
  createdAt?: string;
  updatedAt?: string;
}

// New Umrah Visa Booking Types
export type BookingMode = 'group_number' | 'travel_documents';
export type AccommodationType = 'hotel' | 'iqama';

export interface UmrahPassenger {
  id?: string;
  bookingId?: string;
  isLeadPassenger: boolean;
  fullName: string;
  passportNumber: string;
  nationality: string;
  passportExpiry: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  phoneNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UmrahVisaBooking {
  id?: string;
  serviceId?: string;
  bookingMode: BookingMode;
  groupNumber?: string;
  groupName?: string;
  flightNumber: string;
  arrivalDate: string;
  departureDate: string;
  arrivalAirport: string;
  transportRoute?: string;
  transportType?: string;
  transportPax?: number;
  transportPrice?: number;
  accommodationType: AccommodationType;
  makkahCheckIn?: string;
  makkahCheckOut?: string;
  madinaCheckIn?: string;
  madinaCheckOut?: string;
  iqamaNumber?: string;
  iqamaName?: string;
  iqamaDob?: string;
  iqamaMobile?: string;
  passengerCount: number;
  status?: 'pending' | 'processing' | 'approved' | 'rejected' | 'completed';
  passengers?: UmrahPassenger[];
  createdAt?: string;
  updatedAt?: string;
}

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

export interface TransportPricingResponse {
  route: string;
  transportType: string;
  pax: number;
  price: number;
}

// Document Types
export interface Document {
  id: string;
  serviceId: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalParties: number;
  totalServices: number;
  pendingServices: number;
  completedServices?: number;
}

// Transport Master Types
export interface TransportMaster {
  id: string;
  vehicleRoute: string;
  vehicleType: string;
  pax: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export interface CountryMaster {
  id: string;
  countryCode: string;
  countryName: string;
  nationality: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export interface CurrencyMaster {
  id: string;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
export interface DestinationMaster {
  id: string;
  destinationCode: string;
  destinationName: string;
  city: string;
  country: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
export interface HotelMaster {
  id: string;
  hotelCode: string;
  hotelName: string;
  destinationId: string;
  category: string;
  capacity: number;
  amenities: string[];
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  destination?: {
    id: string;
    destinationName: string;
    city: string;
  };
}

export interface CreateHotelMasterRequest {
  hotelCode: string;
  hotelName: string;
  destinationId?: string;
  category?: string;
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
export interface ServiceTypeMaster {
  id: string;
  serviceCode: string;
  serviceName: string;
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceTypeMasterRequest {
  serviceCode: string;
  serviceName: string;
  category?: string;
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
export interface UserRoleMaster {
  id: string;
  roleCode: string;
  roleName: string;
  permissions: string[];
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
export interface AirportRouteMaster {
  id: string;
  routeCode: string;
  routeName: string;
  fromAirport: string;
  toAirport: string;
  fromDestinationId?: string;
  toDestinationId?: string;
  fromDestination?: {
    id: string;
    destinationName: string;
    city: string;
    country?: string;
  };
  toDestination?: {
    id: string;
    destinationName: string;
    city: string;
    country?: string;
  };
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

// API Error
export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}
