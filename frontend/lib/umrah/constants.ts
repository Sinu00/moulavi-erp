// Umrah Visa Booking Constants

export const BOOKING_LIMITS = {
  MAX_TRAVEL_DAYS: 80,
  MAX_PASSENGERS_IQAMA: 5,
  FLIGHT_NUMBER_MAX_LENGTH: 7,
} as const;

export const FLIGHT_NUMBER_REGEX = /^[A-Z]{2}-\d{1,4}$/;

export const BOOKING_MODES = {
  GROUP_NUMBER: 'group_number',
  TRAVEL_DETAILS: 'travel_details',
} as const;

export const ACCOMMODATION_TYPES = {
  HOTEL: 'hotel',
  IQAMA: 'iqama',
} as const;

export const DOCUMENT_TYPES = {
  PAN_CARD: 'panCardPhoto',
  PASSPORT_FRONT: 'passportFront',
  PASSPORT_BACK: 'passportBack',
  IQAMA_PHOTO: 'iqamaPhoto',
  HOTEL_BOOKING: 'hotelBooking',
  TICKET_COPY: 'ticketCopy',
} as const;

export const BOOKING_RULES = {
  group: {
    iqama: {
      documents: ['panCardPhoto', 'passportFront', 'passportBack', 'iqamaPhoto'],
      description: 'Group + Iqama: PAN Card, Passport Front & Back, Iqama Photo required',
    },
    hotel: {
      documents: ['panCardPhoto', 'passportFront', 'passportBack', 'hotelBooking', 'ticketCopy'],
      description: 'Group + Hotel: PAN Card, Passport Front & Back, Hotel Booking & Ticket Copy required',
    },
  },
  regular: {
    documents: ['panCardPhoto', 'passportFront', 'passportBack'],
    description: 'Individual booking: PAN Card, Passport Front & Back required',
  },
} as const;

export const STEPS = [
  {
    id: 1,
    title: 'Booking Mode',
    description: 'Choose booking type',
    icon: 'Users',
  },
  {
    id: 2,
    title: 'Travel Details',
    description: 'Flight and transport information',
    icon: 'Plane',
  },
  {
    id: 3,
    title: 'Accommodation',
    description: 'Hotel or Iqama details',
    icon: 'Home',
  },
  {
    id: 4,
    title: 'Passengers',
    description: 'Passenger information',
    icon: 'User',
  },
] as const;

export const API_ENDPOINTS = {
  AIRPORTS: '/airport-masters/active',
  DESTINATIONS: '/destination-masters/active',
  TRANSPORT_OPTIONS: '/umrah-visa/transport-options',
  HOTELS: '/umrah-visa/hotels',
  STEP1: '/umrah-visa/step1',
  STEP2: '/umrah-visa/step2',
  STEP3: '/umrah-visa/step3',
  STEP4: '/umrah-visa/step4',
  LOGOUT: '/auth/logout',
} as const;
