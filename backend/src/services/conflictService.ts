import { prisma } from '../config/database';
import { CreateUmrahVisaBookingRequest } from '../types';

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: ConflictDetail[];
}

export interface ConflictDetail {
  type: 'group_number' | 'flight_booking' | 'passenger_limit' | 'transport_capacity';
  message: string;
  severity: 'error' | 'warning';
  conflictingData?: any;
}

export class ConflictService {
  /**
   * Check for booking conflicts before creation
   */
  static async checkBookingConflicts(
    bookingData: CreateUmrahVisaBookingRequest
  ): Promise<ConflictCheckResult> {
    const conflicts: ConflictDetail[] = [];

    // Check group number conflicts
    if (bookingData.booking_mode === 'group_number' && bookingData.group_number) {
      const groupConflict = await this.checkGroupNumberConflict(bookingData.group_number);
      if (groupConflict) {
        conflicts.push(groupConflict);
      }
    }

    // Check flight booking conflicts
    const flightConflict = await this.checkFlightBookingConflict(
      bookingData.flight_number,
      bookingData.arrival_date,
      bookingData.departure_date
    );
    if (flightConflict) {
      conflicts.push(flightConflict);
    }

    // Check passenger limit conflicts
    const passengerConflict = await this.checkPassengerLimitConflict(
      bookingData.party_id,
      bookingData.passenger_count,
      bookingData.accommodation_type
    );
    if (passengerConflict) {
      conflicts.push(passengerConflict);
    }

    // Check transport capacity conflicts
    if (bookingData.transport_route && bookingData.transport_type && bookingData.transport_pax) {
      const transportConflict = await this.checkTransportCapacityConflict(
        bookingData.transport_route,
        bookingData.transport_type,
        bookingData.transport_pax,
        bookingData.arrival_date
      );
      if (transportConflict) {
        conflicts.push(transportConflict);
      }
    }

    return {
      hasConflict: conflicts.some(c => c.severity === 'error'),
      conflicts
    };
  }

  /**
   * Check for duplicate group number
   */
  private static async checkGroupNumberConflict(groupNumber: string): Promise<ConflictDetail | null> {
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
        arrivalDate: true,
        departureDate: true,
        status: true
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
    const existingBooking = await prisma.umrahVisaBooking.findFirst({
      where: {
        flightNumber,
        arrivalDate: new Date(arrivalDate),
        departureDate: new Date(departureDate),
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
   * Check passenger limit conflicts
   */
  private static async checkPassengerLimitConflict(
    partyId: string,
    passengerCount: number,
    accommodationType: string
  ): Promise<ConflictDetail | null> {
    // Get party limits
    const partyLimits = await prisma.partyLimits.findUnique({
      where: { partyId },
      select: {
        maxPassengers: true,
        maxPassengersIqama: true
      }
    });

    const maxPassengers = accommodationType === 'iqama' 
      ? (partyLimits?.maxPassengersIqama || 5)
      : (partyLimits?.maxPassengers || 50);

    if (passengerCount > maxPassengers) {
      return {
        type: 'passenger_limit',
        message: `Passenger count ${passengerCount} exceeds limit of ${maxPassengers} for ${accommodationType} accommodation`,
        severity: 'error',
        conflictingData: {
          requested: passengerCount,
          limit: maxPassengers,
          accommodationType
        }
      };
    }

    // Check for existing bookings on the same dates that might exceed limits
    const existingBookings = await prisma.umrahVisaBooking.findMany({
      where: {
        service: {
          partyId
        },
        isDeleted: false,
        status: {
          not: 'cancelled'
        }
      },
      select: {
        passengerCount: true,
        arrivalDate: true,
        departureDate: true
      }
    });

    const totalPassengers = existingBookings.reduce((sum, booking) => sum + booking.passengerCount, 0);
    
    if (totalPassengers + passengerCount > maxPassengers * 2) { // Allow some flexibility
      return {
        type: 'passenger_limit',
        message: `Total passengers ${totalPassengers + passengerCount} may exceed party capacity`,
        severity: 'warning',
        conflictingData: {
          existing: totalPassengers,
          requested: passengerCount,
          total: totalPassengers + passengerCount,
          limit: maxPassengers * 2
        }
      };
    }

    return null;
  }

  /**
   * Check transport capacity conflicts
   */
  private static async checkTransportCapacityConflict(
    transportRoute: string,
    transportType: string,
    transportPax: number,
    arrivalDate: string
  ): Promise<ConflictDetail | null> {
    // Get transport master to validate capacity
    const transportMaster = await prisma.transportMaster.findFirst({
      where: {
        vehicleRoute: transportRoute,
        vehicleType: transportType,
        pax: transportPax,
        isActive: true
      }
    });

    if (!transportMaster) {
      return {
        type: 'transport_capacity',
        message: `Transport ${transportType} with ${transportPax} PAX not available for route ${transportRoute}`,
        severity: 'error'
      };
    }

    // Check for existing bookings using the same transport on the same date
    const existingBookings = await prisma.umrahVisaBooking.findMany({
      where: {
        transportRoute,
        transportType,
        arrivalDate: new Date(arrivalDate),
        isDeleted: false,
        status: {
          not: 'cancelled'
        }
      },
      select: {
        id: true,
        transportPax: true,
        groupName: true
      }
    });

    const totalPax = existingBookings.reduce((sum, booking) => sum + (booking.transportPax || 0), 0);
    
    // Check if this would exceed reasonable capacity (assuming max 3 bookings per transport per day)
    if (existingBookings.length >= 3) {
      return {
        type: 'transport_capacity',
        message: `Transport ${transportType} is fully booked for ${arrivalDate}`,
        severity: 'error',
        conflictingData: {
          existingBookings: existingBookings.length,
          totalPax,
          requestedPax: transportPax
        }
      };
    }

    return null;
  }

  /**
   * Check for duplicate passengers within the same booking
   */
  static async checkDuplicatePassengers(passengers: any[]): Promise<ConflictDetail | null> {
    const passportNumbers = passengers.map(p => p.passport_number);
    const duplicates = passportNumbers.filter((item, index) => passportNumbers.indexOf(item) !== index);
    
    if (duplicates.length > 0) {
      return {
        type: 'passenger_limit',
        message: `Duplicate passport numbers found: ${duplicates.join(', ')}`,
        severity: 'error',
        conflictingData: { duplicates }
      };
    }

    return null;
  }

  /**
   * Check for overlapping date ranges
   */
  static async checkDateOverlap(
    partyId: string,
    arrivalDate: string,
    departureDate: string
  ): Promise<ConflictDetail | null> {
    const overlappingBookings = await prisma.umrahVisaBooking.findMany({
      where: {
        service: {
          partyId
        },
        isDeleted: false,
        status: {
          not: 'cancelled'
        },
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
      },
      select: {
        id: true,
        arrivalDate: true,
        departureDate: true,
        groupName: true,
        passengerCount: true
      }
    });

    if (overlappingBookings.length > 0) {
      return {
        type: 'flight_booking',
        message: `Date range overlaps with existing bookings`,
        severity: 'warning',
        conflictingData: {
          overlappingBookings,
          requestedRange: {
            arrivalDate: new Date(arrivalDate),
            departureDate: new Date(departureDate)
          }
        }
      };
    }

    return null;
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
          const alternativeGroupNumber = await this.generateAlternativeGroupNumber(bookingData.group_number!);
          conflict.conflictingData = { ...conflict.conflictingData, alternativeGroupNumber };
          unresolved.push(conflict);
          break;

        case 'flight_booking':
          // Check if it's the same party (allow same party bookings)
          if (conflict.conflictingData) {
            const existingBooking = await prisma.umrahVisaBooking.findUnique({
              where: { id: conflict.conflictingData.id },
              include: {
                service: {
                  select: { partyId: true }
                }
              }
            });

            if (existingBooking?.service.partyId === bookingData.party_id) {
              resolved.push({
                ...conflict,
                message: 'Same party booking - conflict resolved',
                severity: 'warning'
              });
            } else {
              unresolved.push(conflict);
            }
          } else {
            unresolved.push(conflict);
          }
          break;

        case 'passenger_limit':
          if (conflict.severity === 'warning') {
            resolved.push(conflict);
          } else {
            unresolved.push(conflict);
          }
          break;

        case 'transport_capacity':
          unresolved.push(conflict);
          break;

        default:
          unresolved.push(conflict);
      }
    }

    return { resolved, unresolved };
  }

  /**
   * Generate alternative group number
   */
  private static async generateAlternativeGroupNumber(originalGroupNumber: string): Promise<string> {
    const baseNumber = originalGroupNumber.replace(/\d+$/, '');
    const lastDigit = originalGroupNumber.match(/\d+$/)?.[0] || '1';
    
    let counter = parseInt(lastDigit) + 1;
    let alternative = `${baseNumber}${counter}`;

    // Check if alternative exists
    while (await this.checkGroupNumberConflict(alternative)) {
      counter++;
      alternative = `${baseNumber}${counter}`;
    }

    return alternative;
  }
}
