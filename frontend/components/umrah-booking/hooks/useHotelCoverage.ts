import { useMemo } from 'react';
import { calculateHotelCoverage } from '@/lib/umrah/validation';
import { HotelBooking } from '@/lib/umrah/types';

interface UseHotelCoverageParams {
  arrivalDate?: string;
  departureDate?: string;
  hotelBookings?: HotelBooking[];
}

export const useHotelCoverage = ({
  arrivalDate,
  departureDate,
  hotelBookings,
}: UseHotelCoverageParams) => {
  const coverage = useMemo(() => {
    if (!arrivalDate || !departureDate || !hotelBookings) {
      return { totalCovered: 0, uncoveredDates: [], remainingDays: 0, totalBookedDays: 0 };
    }
    return calculateHotelCoverage(arrivalDate, departureDate, hotelBookings);
  }, [arrivalDate, departureDate, hotelBookings]);

  const totalDays = useMemo(() => {
    if (!arrivalDate || !departureDate) return 0;
    return Math.ceil(
      (new Date(departureDate).getTime() - new Date(arrivalDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }, [arrivalDate, departureDate]);

  const coveredDays = totalDays - coverage.remainingDays;
  const coveragePercentage =
    totalDays > 0 ? Math.round((coveredDays / totalDays) * 100) : 0;
  
  // Calculate days beyond trip duration
  const daysBeyond = Math.max(0, (coverage.totalBookedDays || 0) - totalDays);

  return {
    ...coverage,
    totalDays,
    coveredDays,
    coveragePercentage,
    daysBeyond, // Days booked beyond the trip duration
  };
};

