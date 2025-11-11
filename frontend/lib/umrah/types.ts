// Umrah Visa Booking Types

export interface Step1Data {
  bookingMode: 'group_number' | 'travel_details';
  groupNumber?: string;
  groupName?: string;
  passengerCount?: number;
  umrahVisaProviderId?: string;
}

export interface Step2Data {
  arrivalDate: string;
  arrivalTime: string;
  arrivalAirportId: string;
  arrivalFlightNumber: string;
  departureDate: string;
  departureTime: string;
  departureAirportId: string;
  departureFlightNumber: string;
  transportBookings?: TransportBooking[];
  hotelBookings?: HotelBooking[]; // For group bookings, hotels are in Step 2
}

export interface Step3Data {
  accommodationType?: 'hotel' | 'iqama'; // Made optional for group bookings
  iqamaDetails?: IqamaDetails;
  hotelBookings?: HotelBooking[]; // For backward compatibility and submission
  transportSegments?: TransportBooking[];
  ziyarah?: ZiyarahBooking[];
  ziyaraths?: Array<{
    id: string; // Unique ID for this entry
    ziyarathId: string; // LocationMaster ID of the ziyarath
    date: string; // yyyy-MM-dd
    time: string; // HH:mm
  }>;
}

export interface Step4Data {
  selectedTransport?: {
    routeId: string;
    transportId: string;
    vehicleTypeId: string;
    price: number;
  };
}

export interface Step5Data {
  passengers: Passenger[];
  panCardZipFile?: File | null; // ZIP file containing all PAN cards for group bookings
}

export interface TransportBooking {
  fromLocationId: string;
  toLocationId: string;
  fromHotelId?: string; // HotelMaster ID (can be hotel, ziyarah, or empty for airport)
  toHotelId?: string; // HotelMaster ID (can be hotel, ziyarah, or empty for airport)
  vehicleType?: string; // Optional - not required anymore
  paxCount: number;
  price: number;
  travelDate?: string;
  travelTime?: string;
}

export interface HotelBooking {
  locationId: string;
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
  brn?: string[];
}

export interface IqamaDetails {
  iqamaNumber?: string;
  iqamaName?: string;
  iqamaDob?: string;
  iqamaMobile?: string;
  iqamaNationalShortAddress?: string;
}

export interface Passenger {
  fullName: string;
  isLeadPassenger: boolean;
  panCardPhoto?: File | null;
  passportFront?: File | null;
  passportBack?: File | null;
  iqamaPhoto?: File | null;
  hotelBooking?: File | null;
  ticketCopy?: File | null;
}

export interface Airport {
  id: string;
  airportCode: string;
  airportName: string;
}

export interface Location {
  id: string;
  destinationName: string;
  city?: string;
}

export interface Hotel {
  id: string;
  name: string;
  hotelName?: string; // For backward compatibility
  code?: string;
  cityId?: string;
  city?: {
    id: string;
    name: string;
  };
}

export interface TransportOption {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  vehicleType: string;
  paxCount: number;
  price: number;
  fromLocation: Location;
  toLocation: Location;
}

export interface BookingState {
  currentStep: number;
  completedSteps: number[];
  bookingId: string | null;
  step1Data: Step1Data;
  step2Data: Step2Data;
  step3Data: Step3Data;
  step4Data: Step4Data;
  step5Data: Step5Data;
}

export interface ZiyarahBooking {
  city: 'Makkah' | 'Madinah';
  date: string;
  time: string;
}

export interface LocationMaster {
  id: string;
  code: string;
  name: string;
  locationType: 'AIRPORT' | 'DESTINATION' | 'ZIYARAT' | 'HOTEL' | 'OTHERS';
  city: string;
  country?: {
    id: string;
    countryCode: string;
    countryName: string;
  };
  cityMaster?: {
    id: string;
    name: string;
  };
}

export interface MasterData {
  airports: Airport[];
  locations: Location[];
  hotels: Hotel[];
  transportOptions: TransportOption[];
  hotelsByLocation: { [locationId: string]: Hotel[] };
  locationMasters: LocationMaster[];
}
