import prisma from '../lib/prisma';
import { CreateUmrahVisaBookingRequest } from '../types';

export interface ConflictDetail {
  type: 'group_number' | 'flight_booking' | 'passenger_limit' | 'transport_capacity' | 'date_overlap';
  message: string;
  severity: 'error' | 'warning' | 'info';
  conflictingData?: any;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: ConflictDetail[];
  canProceed: boolean;
}

export class ConflictService {
  /**
   * Check all potential conflicts for a booking
   */
  static async checkBookingConflicts(
    bookingData: CreateUmrahVisaBookingRequest
  ): Promise<ConflictCheckResult> {
    const conflicts: ConflictDetail[] = [];

    // Check group number conflicts
    if (bookingData.groupNumber) {
      const groupConflict = await this.checkGroupNumberConflict(bookingData.groupNumber);
      if (groupConflict) {
        conflicts.push(groupConflict);
      }
    }

    // Check flight booking conflicts
    if (bookingData.travelDetails?.arrivalFlightNumber) {
      const flightConflict = await this.checkFlightBookingConflict(
        bookingData.travelDetails.arrivalFlightNumber,
        bookingData.travelDetails.arrivalDate,
        bookingData.travelDetails.departureDate
      );
      if (flightConflict) {
        conflicts.push(flightConflict);
      }
    }

    // Check passenger limit conflicts
    const passengerConflict = await this.checkPassengerLimitConflict(
      bookingData.serviceId,
      bookingData.passengerCount,
      bookingData.accommodationType || 'hotel'
    );
    if (passengerConflict) {
      conflicts.push(passengerConflict);
    }

    // Check for date overlaps
    if (bookingData.travelDetails?.arrivalDate && bookingData.travelDetails?.departureDate) {
      const dateConflict = await this.checkDateOverlap(
        bookingData.serviceId,
        bookingData.travelDetails.arrivalDate,
        bookingData.travelDetails.departureDate
      );
      if (dateConflict) {
        conflicts.push(dateConflict);
      }
    }

    const hasConflicts = conflicts.length > 0;
    const canProceed = !conflicts.some(conflict => conflict.severity === 'error');

    return {
      hasConflicts,
      conflicts,
      canProceed
    };
  }

  /**
   * Check for duplicate group numbers
   */
  private static async checkGroupNumberConflict(
    groupNumber: string
  ): Promise<ConflictDetail | null> {
    const existingBooking = await prisma.umrahVisaBooking.findFirst({
      where: {
        groupNumber,
        isDeleted: false,
        status: {
          not: 'cancelled'
        }
      },
      select: {
        id: true,
        groupName: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (existingBooking) {
      return {
        type: 'group_number',
        message: `Group number ${groupNumber} is already used in booking ${existingBooking.id}`,
        severity: 'error',
        conflictingData: existingBooking
      };
    }

    return null;
  }

  /**
   * Check for duplicate flight booking
   */
  private static async checkFlightBookingConflict(
    flightNumber: string,
    arrivalDate: string,
    departureDate: string
  ): Promise<ConflictDetail | null> {
    // Check for flight conflicts through travel details
    const existingBooking = await prisma.umrahVisaBooking.findFirst({
      where: {
        travelDetails: {
          OR: [
            { arrivalFlightNumber: flightNumber },
            { departureFlightNumber: flightNumber }
          ]
        },
        isDeleted: false,
        status: {
          not: 'cancelled'
        }
      },
      select: {
        id: true,
        groupName: true,
        groupNumber: true,
        status: true,
        passengerCount: true
      }
    });

    if (existingBooking) {
      return {
        type: 'flight_booking',
        message: `Flight ${flightNumber} on ${arrivalDate} to ${departureDate} is already booked`,
        severity: 'error',
        conflictingData: existingBooking
      };
    }

    return null;
  }

  /**
   * Check passenger limits for party
   */
  private static async checkPassengerLimitConflict(
    serviceId: string,
    passengerCount: number,
    accommodationType: string
  ): Promise<ConflictDetail | null> {
    // Get the service to find the party
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { partyId: true }
    });

    if (!service) {
      return {
        type: 'passenger_limit',
        message: 'Service not found',
        severity: 'error'
      };
    }

    // Get party limits
    const partyLimits = await prisma.partyLimits.findUnique({
      where: { partyId: service.partyId }
    });

    if (!partyLimits) {
      return null; // No limits set
    }

    const maxPassengers = accommodationType === 'iqama' 
      ? partyLimits.maxPassengersIqama 
      : partyLimits.maxPassengers;

    // Check for existing bookings on the same dates that might exceed limits
    const existingBookings = await prisma.umrahVisaBooking.findMany({
      where: {
        service: {
          partyId: service.partyId
        },
        isDeleted: false,
        status: {
          not: 'cancelled'
        }
      },
      select: {
        passengerCount: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const totalPassengers = existingBookings.reduce((sum: number, booking: any) => sum + booking.passengerCount, 0);
    
    if (totalPassengers + passengerCount > maxPassengers * 2) { // Allow some flexibility
      return {
        type: 'passenger_limit',
        message: `Total passengers ${totalPassengers + passengerCount} may exceed party capacity`,
        severity: 'warning',
        conflictingData: {
          existing: totalPassengers,
          requested: passengerCount,
          limit: maxPassengers
        }
      };
    }

    return null;
  }

  /**
   * Check for overlapping date ranges
   */
  static async checkDateOverlap(
    serviceId: string,
    arrivalDate: string,
    departureDate: string
  ): Promise<ConflictDetail | null> {
    // Get the service to find the party
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { partyId: true }
    });

    if (!service) {
      return null;
    }

    const overlappingBookings = await prisma.umrahVisaBooking.findMany({
      where: {
        service: {
          partyId: service.partyId
        },
        isDeleted: false,
        status: {
          not: 'cancelled'
        },
        travelDetails: {
          OR: [
            {
              arrivalDate: {
                lte: new Date(departureDate)
              },
              departureDate: {
                gte: new Date(arrivalDate)
              }
            }
          ]
        }
      },
      select: {
        id: true,
        groupName: true,
        passengerCount: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (overlappingBookings.length > 0) {
      return {
        type: 'date_overlap',
        message: `Date range overlaps with existing bookings`,
        severity: 'warning',
        conflictingData: overlappingBookings
      };
    }

    return null;
  }

  /**
   * Generate alternative group number
   */
  private static async generateAlternativeGroupNumber(baseNumber: string): Promise<string> {
    let counter = 1;
    let alternativeNumber = `${baseNumber}-${counter}`;
    
    while (true) {
      const existing = await prisma.umrahVisaBooking.findFirst({
        where: { groupNumber: alternativeNumber }
      });
      
      if (!existing) {
        return alternativeNumber;
      }
      
      counter++;
      alternativeNumber = `${baseNumber}-${counter}`;
    }
  }

  /**
   * Resolve conflicts automatically where possible
   */
  static async resolveConflicts(
    conflicts: ConflictDetail[],
    bookingData: CreateUmrahVisaBookingRequest
  ): Promise<{ resolved: ConflictDetail[]; unresolved: ConflictDetail[] }> {
    const resolved: ConflictDetail[] = [];
    const unresolved: ConflictDetail[] = [];

    for (const conflict of conflicts) {
      switch (conflict.type) {
        case 'group_number':
          // Suggest alternative group number
          const alternativeGroupNumber = await this.generateAlternativeGroupNumber(bookingData.groupNumber!);
          conflict.conflictingData = { ...conflict.conflictingData, alternativeGroupNumber };
          unresolved.push(conflict);
          break;

        case 'flight_booking':
          // Check if it's the same party booking
          const existingBooking = await prisma.umrahVisaBooking.findUnique({
            where: { id: conflict.conflictingData?.id },
            include: {
              service: {
                select: { partyId: true }
              }
            }
          });

          if (existingBooking?.service.partyId === bookingData.serviceId) {
            resolved.push({
              ...conflict,
              message: 'Same party booking - conflict resolved',
              severity: 'warning'
            });
          } else {
            unresolved.push(conflict);
          }
          break;

        case 'passenger_limit':
        case 'transport_capacity':
        case 'date_overlap':
          // These require manual resolution
          unresolved.push(conflict);
          break;

        default:
          unresolved.push(conflict);
      }
    }

    return { resolved, unresolved };
  }
}