import { useEffect } from 'react';
import { TransportBooking, HotelBooking, Location } from '@/lib/umrah/types';

interface UseAutoTransportSegmentsParams {
  hotelsValid: boolean;
  hotelBookings?: HotelBooking[];
  locations: Location[];
  arrivalDate?: string;
  departureDate?: string;
  arrivalTime?: string;
  departureTime?: string;
  arrivalAirportId?: string;
  departureAirportId?: string;
  onChange: (segments: TransportBooking[]) => void;
}

export const useAutoTransportSegments = ({
  hotelsValid,
  hotelBookings,
  locations,
  arrivalDate,
  departureDate,
  arrivalTime,
  departureTime,
  arrivalAirportId,
  departureAirportId,
  onChange,
}: UseAutoTransportSegmentsParams) => {
  // Find ziyarah hotels by name
  const findZiyarahHotel = (
    cityName: string,
    getAllHotelsForLocation: (locationId: string) => any[]
  ) => {
    const cityLoc = locations.find(
      (l) => (l.city || '').toLowerCase() === cityName.toLowerCase()
    );
    if (!cityLoc) return null;
    return getAllHotelsForLocation(cityLoc.id).find(
      (h: any) =>
        (h.hotelName || '').toLowerCase().includes('ziyarah') ||
        (h.hotelCode || '').includes('ZIY')
    );
  };

  useEffect(() => {
    if (!hotelsValid) {
      onChange([]);
      return;
    }

    const bookings = hotelBookings || [];
    const segments: TransportBooking[] = [];

    // Helper to get location ID from cityId
    const getLocationIdFromCityId = (cityId: string): string | undefined => {
      // First try to find location by matching cityId with location id (if locations are cities)
      const location = locations.find((l: any) => l.id === cityId || l.cityId === cityId);
      return location?.id || cityId; // Fallback to cityId if no location found
    };

    // 1) Arrival airport → first hotel
    const firstHotel = bookings[0];
    if (arrivalDate && firstHotel && arrivalAirportId) {
      const hotelLocationId = getLocationIdFromCityId(firstHotel.cityId);
      if (hotelLocationId) {
        segments.push({
          fromLocationId: arrivalAirportId, // Use arrival airport ID
          toLocationId: hotelLocationId,
          fromHotelId: '', // Airport, no hotel
          toHotelId: firstHotel.hotelId,
          paxCount: 0,
          price: 0,
          travelDate: arrivalDate,
          travelTime: arrivalTime || '',
        });
      }
    }

    // 2) Inter-city moves between hotels (Hotel 1 → Hotel 2, etc.)
    for (let i = 1; i < bookings.length; i++) {
      const prev = bookings[i - 1];
      const curr = bookings[i];
      const prevLocationId = getLocationIdFromCityId(prev.cityId);
      const currLocationId = getLocationIdFromCityId(curr.cityId);
      if (prevLocationId && currLocationId) {
        segments.push({
          fromLocationId: prevLocationId,
          toLocationId: currLocationId,
          fromHotelId: prev.hotelId,
          toHotelId: curr.hotelId,
          paxCount: 0,
          price: 0,
          travelDate: curr.checkInDate || '',
          travelTime: '',
        });
      }
    }

    // 3) Last hotel → departure airport
    const lastHotel = bookings[bookings.length - 1];
    if (departureDate && lastHotel && departureAirportId) {
      const hotelLocationId = getLocationIdFromCityId(lastHotel.cityId);
      if (hotelLocationId) {
        segments.push({
          fromLocationId: hotelLocationId,
          toLocationId: departureAirportId, // Use departure airport ID
          fromHotelId: lastHotel.hotelId,
          toHotelId: '', // Airport, no hotel
          paxCount: 0,
          price: 0,
          travelDate: departureDate,
          travelTime: departureTime || '',
        });
      }
    }

    // Note: Ziyarah segments need getAllHotelsForLocation function which is context-specific
    // So we'll handle ziyarah in the component itself or pass it as a callback

    onChange(segments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hotelsValid,
    JSON.stringify(hotelBookings),
    arrivalDate,
    departureDate,
    arrivalTime,
    departureTime,
    arrivalAirportId,
    departureAirportId,
  ]);
};

// Helper function for ziyarah segments (to be used in component)
export const generateZiyarahSegments = (
  hotelBookings: HotelBooking[],
  locations: Location[],
  getAllHotelsForLocation: (locationId: string) => any[]
): TransportBooking[] => {
  const segments: TransportBooking[] = [];

  const findZiyarahHotel = (cityName: string) => {
    const cityLoc = locations.find(
      (l) => (l.city || '').toLowerCase() === cityName.toLowerCase()
    );
    if (!cityLoc) return null;
    return getAllHotelsForLocation(cityLoc.id).find(
      (h: any) =>
        (h.hotelName || '').toLowerCase().includes('ziyarah') ||
        (h.hotelCode || '').includes('ZIY')
    );
  };

  const getCheckInForCity = (cityName: string) => {
    const cityLoc = locations.find(
      (l) => (l.city || '').toLowerCase() === cityName.toLowerCase()
    );
    if (!cityLoc) return null;
    // Match by cityId instead of locationId
    const hb = hotelBookings.find((h) => h.cityId === cityLoc.id || (cityLoc as any).cityId === h.cityId);
    return hb?.checkInDate;
  };

  const addZiyarahSegment = (
    cityName: 'makkah' | 'madinah',
    ziyarahHotel: any
  ) => {
    const checkIn = getCheckInForCity(cityName);
    if (!checkIn || !ziyarahHotel) return;

    const cityLoc = locations.find(
      (l) => (l.city || '').toLowerCase() === cityName.toLowerCase()
    );
    if (!cityLoc) return;

    // Match by cityId instead of locationId
    const cityHotelBooking = hotelBookings.find(
      (h) => h.cityId === cityLoc.id || (cityLoc as any).cityId === h.cityId
    );
    if (!cityHotelBooking) return;

    const base = new Date(checkIn);
    base.setDate(base.getDate() + 2);
    // Friday -> Saturday
    if (base.getUTCDay() === 5) base.setDate(base.getDate() + 1);
    const dateStr = base.toISOString().split('T')[0];

    // Both from and to are in the same city, but different specific locations
    // fromLocationId and toLocationId = city location ID (same)
    // fromHotelId = hotel LocationMaster ID
    // toHotelId = ziyarah LocationMaster ID
    segments.push({
      fromLocationId: cityLoc.id, // City location ID (e.g., Makkah city)
      toLocationId: cityLoc.id, // City location ID (same city)
      fromHotelId: cityHotelBooking.hotelId, // Hotel LocationMaster ID
      toHotelId: ziyarahHotel.id, // Ziyarah LocationMaster ID
      paxCount: 0,
      price: 0,
      travelDate: dateStr,
      travelTime: cityName === 'makkah' ? '08:00' : '14:00',
    });
  };

  const makZiy = findZiyarahHotel('makkah');
  const madZiy = findZiyarahHotel('madinah');

  console.log('[generateZiyarahSegments] Found ziyarah hotels:', {
    makkah: makZiy ? makZiy.name || makZiy.hotelName : null,
    madinah: madZiy ? madZiy.name || madZiy.hotelName : null,
    makkahId: makZiy?.id,
    madinahId: madZiy?.id,
  });

  if (makZiy) {
    console.log('[generateZiyarahSegments] Adding Makkah ziyarah segment');
    addZiyarahSegment('makkah', makZiy);
  }
  if (madZiy) {
    console.log('[generateZiyarahSegments] Adding Madinah ziyarah segment');
    addZiyarahSegment('madinah', madZiy);
  }

  console.log('[generateZiyarahSegments] Returning', segments.length, 'ziyarah segments');
  return segments;
};

