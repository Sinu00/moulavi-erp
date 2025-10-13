// Umrah Visa Booking Configuration

export interface RouteOption {
  id: string;
  name: string;
  requiresTransport: boolean;
  description?: string;
}

export interface TransportOption {
  id: string;
  name: string;
  description: string;
  paxOptions: number[];
  basePrice: number; // Base price per route
}

export interface TransportPricing {
  [routeId: string]: {
    [transportId: string]: {
      [pax: number]: number;
    };
  };
}

// Route options for arrival airport/destination
export const ROUTE_OPTIONS: RouteOption[] = [
  { id: 'jeddah_to_jeddah', name: 'Jeddah to Jeddah', requiresTransport: true },
  { id: 'jeddah_to_makkah', name: 'Jeddah to Makkah', requiresTransport: true },
  { id: 'makkah_to_jeddah', name: 'Makkah to Jeddah', requiresTransport: false },
  { id: 'jeddah_to_madina', name: 'Jeddah to Madina', requiresTransport: true },
  { id: 'madina_to_jeddah', name: 'Madina to Jeddah', requiresTransport: false },
  { id: 'jeddah_makkah_madina_jeddah', name: 'Jeddah - Makkah - Madina - Jeddah', requiresTransport: true },
  { id: 'makkah_to_taif', name: 'Makkah to Taif', requiresTransport: false },
  { id: 'makkah_mazarath_to_madina_mazarath', name: 'Makkah Mazarath to Madina Mazarath', requiresTransport: false },
  { id: 'train_station_to_hotel', name: 'Train Station to Hotel', requiresTransport: false },
  { id: 'train_station_return', name: 'Train Station Return', requiresTransport: false },
  { id: 'madina_airport_to_hotel', name: 'Madina Airport to Hotel', requiresTransport: false },
  { id: 'madina_hotel_to_airport', name: 'Madina Hotel to Airport', requiresTransport: false },
];

// Transport options
export const TRANSPORT_OPTIONS: TransportOption[] = [
  {
    id: 'lexus_es_250',
    name: 'Lexus ES 250',
    description: 'Luxury sedan with premium comfort',
    paxOptions: [3],
    basePrice: 500
  },
  {
    id: 'staria',
    name: 'Staria',
    description: 'Modern van with spacious interior',
    paxOptions: [8],
    basePrice: 400
  },
  {
    id: 'gmc',
    name: 'GMC',
    description: 'Robust SUV for group travel',
    paxOptions: [7],
    basePrice: 450
  },
  {
    id: 'hiace',
    name: 'Hiace',
    description: 'Reliable van for large groups',
    paxOptions: [10],
    basePrice: 350
  }
];

// Transport pricing matrix
export const TRANSPORT_PRICING: TransportPricing = {
  'jeddah_to_makkah': {
    'lexus_es_250': { 3: 150 },
    'staria': { 8: 250 },
    'gmc': { 7: 220 },
    'hiace': { 10: 220 }
  },
  'jeddah_to_madina': {
    'lexus_es_250': { 3: 200 },
    'staria': { 8: 350 },
    'gmc': { 7: 320 },
    'hiace': { 10: 320 }
  },
  'jeddah_makkah_madina_jeddah': {
    'lexus_es_250': { 3: 400 },
    'staria': { 8: 700 },
    'gmc': { 7: 650 },
    'hiace': { 10: 650 }
  },
  'jeddah_to_jeddah': {
    'lexus_es_250': { 3: 100 },
    'staria': { 8: 150 },
    'gmc': { 7: 150 },
    'hiace': { 10: 180 }
  }
};

// Validation rules
export const VALIDATION_RULES = {
  MAX_TRAVEL_DAYS: 80,
  MAX_PASSENGERS_IQAMA: 5,
  MIN_PASSENGERS: 1,
  MAX_PASSENGERS: 50,
  REQUIRED_DOCUMENTS: {
    group_number: {
      lead_passenger: ['pan_card', 'passport_front', 'passport_back'],
      other_passengers: ['passport_front', 'passport_back']
    },
    travel_documents: {
      lead_passenger: ['pan_card', 'passport_front', 'passport_back'],
      other_passengers: ['passport_front', 'passport_back']
    }
  }
};

// Document types
export const DOCUMENT_TYPES = {
  PAN_CARD: 'pan_card',
  PASSPORT_FRONT: 'passport_front',
  PASSPORT_BACK: 'passport_back',
  PHOTO: 'photo'
} as const;

// Helper functions
export function getRouteById(routeId: string): RouteOption | undefined {
  return ROUTE_OPTIONS.find(route => route.id === routeId);
}

export function getTransportById(transportId: string): TransportOption | undefined {
  return TRANSPORT_OPTIONS.find(transport => transport.id === transportId);
}

export function getTransportPrice(routeId: string, transportId: string, pax: number): number | null {
  const routePricing = TRANSPORT_PRICING[routeId];
  if (!routePricing) return null;
  
  const transportPricing = routePricing[transportId];
  if (!transportPricing) return null;
  
  return transportPricing[pax] || null;
}

export function requiresTransport(routeId: string): boolean {
  const route = getRouteById(routeId);
  return route?.requiresTransport || false;
}

export function validatePassengerCount(count: number, accommodationType: 'hotel' | 'iqama'): boolean {
  if (count < VALIDATION_RULES.MIN_PASSENGERS || count > VALIDATION_RULES.MAX_PASSENGERS) {
    return false;
  }
  
  if (accommodationType === 'iqama' && count > VALIDATION_RULES.MAX_PASSENGERS_IQAMA) {
    return false;
  }
  
  return true;
}

export function validateTravelDates(arrivalDate: Date, departureDate: Date): boolean {
  const diffTime = departureDate.getTime() - arrivalDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= VALIDATION_RULES.MAX_TRAVEL_DAYS && diffDays > 0;
}
