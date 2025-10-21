// Umrah Visa Booking Types

export interface Step1Data {
  bookingMode: 'group_number' | 'travel_details';
  groupNumber?: string;
  groupName?: string;
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
}

export interface Step3Data {
  accommodationType: 'hotel' | 'iqama';
  iqamaDetails?: IqamaDetails;
  hotelBookings?: HotelBooking[];
}

export interface Step4Data {
  passengers: Passenger[];
}

export interface TransportBooking {
  fromLocationId: string;
  toLocationId: string;
  vehicleType: string;
  paxCount: number;
  price: number;
  travelDate?: string;
}

export interface HotelBooking {
  locationId: string;
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
}

export interface IqamaDetails {
  iqamaNumber?: string;
  iqamaName?: string;
  iqamaDob?: string;
  iqamaMobile?: string;
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
}

export interface Hotel {
  id: string;
  hotelName: string;
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
  skipDocuments: boolean;
}

export interface MasterData {
  airports: Airport[];
  locations: Location[];
  hotels: Hotel[];
  transportOptions: TransportOption[];
  hotelsByLocation: { [locationId: string]: Hotel[] };
}
