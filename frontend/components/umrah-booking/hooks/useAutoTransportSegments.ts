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

    // 1) Arrival airport → first hotel
    const firstHotel = bookings[0];
    if (arrivalDate && firstHotel) {
      const firstHotelLoc = locations.find((l) => l.id === firstHotel.locationId);
      if (firstHotelLoc) {
        segments.push({
          fromLocationId: firstHotelLoc.id,
          toLocationId: firstHotel.locationId,
          fromHotelId: '',
          toHotelId: firstHotel.hotelId,
          vehicleType: '',
          paxCount: 0,
          price: 0,
          travelDate: arrivalDate,
          travelTime: arrivalTime || '',
        });
      }
    }

    // 2) Inter-city moves between hotels
    for (let i = 1; i < bookings.length; i++) {
      const prev = bookings[i - 1];
      const curr = bookings[i];
      if (prev.locationId !== curr.locationId) {
        segments.push({
          fromLocationId: prev.locationId,
          toLocationId: curr.locationId,
          fromHotelId: prev.hotelId,
          toHotelId: curr.hotelId,
          vehicleType: '',
          paxCount: 0,
          price: 0,
          travelDate: curr.checkInDate || '',
          travelTime: '',
        });
      }
    }

    // 3) Last hotel → departure airport
    const lastHotel = bookings[bookings.length - 1];
    if (departureDate && lastHotel) {
      const lastHotelLoc = locations.find((l) => l.id === lastHotel.locationId);
      if (lastHotelLoc) {
        segments.push({
          fromLocationId: lastHotel.locationId,
          toLocationId: lastHotelLoc.id,
          fromHotelId: lastHotel.hotelId,
          toHotelId: '',
          vehicleType: '',
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
    const hb = hotelBookings.find((h) => h.locationId === cityLoc.id);
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

    const cityHotelBooking = hotelBookings.find(
      (h) => h.locationId === cityLoc.id
    );
    if (!cityHotelBooking) return;

    const base = new Date(checkIn);
    base.setDate(base.getDate() + 2);
    // Friday -> Saturday
    if (base.getUTCDay() === 5) base.setDate(base.getDate() + 1);
    const dateStr = base.toISOString().split('T')[0];

    segments.push({
      fromLocationId: cityLoc.id,
      toLocationId: cityLoc.id,
      fromHotelId: cityHotelBooking.hotelId,
      toHotelId: ziyarahHotel.id,
      vehicleType: '',
      paxCount: 0,
      price: 0,
      travelDate: dateStr,
      travelTime: cityName === 'makkah' ? '08:00' : '14:00',
    });
  };

  const makZiy = findZiyarahHotel('makkah');
  const madZiy = findZiyarahHotel('madinah');

  if (makZiy) addZiyarahSegment('makkah', makZiy);
  if (madZiy) addZiyarahSegment('madinah', madZiy);

  return segments;
};

