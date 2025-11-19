import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import {
  prisma,
  validateDateRange,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  FLIGHT_NUMBER_REGEX,
} from './umrahVisa/shared';
import { combineDateTime, splitDateTime } from '../utils/datetime';

const router = Router();

// Individual Step 1 schema - specific to individual visa
const step1Schema = z.object({
  bookingMode: z.enum(['group_number', 'travel_details']),
  groupNumber: z.string().optional(),
  groupName: z.string().optional(),
  umrahVisaProviderId: z.string().uuid().optional(),
}).refine((data) => {
  if (data.bookingMode === 'group_number') {
    if (!data.groupNumber || !data.groupName) {
      return false;
    }
    if (!data.umrahVisaProviderId) {
      return false;
    }
  }
  return true;
}, {
  message: "Group number, group name, and umrah visa provider are required when booking mode is 'group_number'",
  path: ["groupNumber"]
});

// Complete booking schema - combines all steps
const completeBookingSchema = z.object({
  partyId: z.string().uuid(),
  step1: step1Schema,
  step2: step2Schema,
  step3: step3Schema,
  step4: step4Schema.optional(), // Transport selection (optional)
  step5: step5Schema.optional(), // Passengers and documents (new structure)
}).refine((data) => {
  // Either step5 (new structure) or step4 with passengers (old structure) must be provided
  return !!(data.step5 || (data.step4 && data.step4.passengers && data.step4.passengerCount));
}, {
  message: "Either step5 (passengers) or step4 with passengers (backward compatibility) must be provided",
  path: ["step5"]
});

// POST /api/umrah-visa/step1 - Step 1: Validation Only (No DB writes)
router.post('/step1', authenticate, async (req, res) => {
  try {
    const { partyId, ...step1Data } = req.body;
    
    if (!partyId) {
      return res.status(400).json({ error: 'Party ID is required' });
    }

    // Validate only step1 data (without partyId)
    const validatedData = step1Schema.parse(step1Data);

    // Only validate - no database writes
    // Data will be saved only when all steps are completed in create-booking endpoint
    res.status(200).json({
      message: 'Step 1 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in step 1 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 1' });
  }
});

// POST /api/umrah-visa/step2 - Step 2: Validation Only (No DB writes)
router.post('/step2', authenticate, async (req, res) => {
  try {
    const validatedData = step2Schema.parse(req.body);

    // Validate date range (80 days max) - convert strings to Date objects
    const arrivalDateObj = new Date(validatedData.arrivalDate);
    const departureDateObj = new Date(validatedData.departureDate);
    if (!validateDateRange(arrivalDateObj, departureDateObj)) {
      return res.status(400).json({ error: 'Travel duration cannot exceed 80 days' });
    }

    // Only validate - no database writes
    // Data will be saved only when all steps are completed in create-booking endpoint
    res.status(200).json({
      message: 'Step 2 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in step 2 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 2' });
  }
});

// POST /api/umrah-visa/step3 - Step 3: Validation Only (No DB writes)
router.post('/step3', authenticate, async (req, res) => {
  try {
    const validatedData = step3Schema.parse(req.body);

    // Validate iqama passenger count
    if (validatedData.accommodationType === 'iqama' && validatedData.passengerCount && validatedData.passengerCount > 5) {
      return res.status(400).json({ error: 'Maximum 5 passengers allowed for iqama accommodation' });
    }

    // Only validate - no database writes
    // Data will be saved only when all steps are completed in create-booking endpoint
    res.status(200).json({
      message: 'Step 3 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in step 3 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 3' });
  }
});

// POST /api/umrah-visa/create-booking - Create complete booking (all steps in one transaction)
router.post('/create-booking', authenticate, async (req, res) => {
  try {
    const validatedData = completeBookingSchema.parse(req.body);
    const user = (req as any).user;

    // Validate all steps data
    const step1Data = validatedData.step1;
    const step2Data = validatedData.step2;
    const step3Data = validatedData.step3;
    const step4Data = validatedData.step4; // Transport (optional)
    const step5Data = validatedData.step5; // Passengers (new structure)
    
    // Support backward compatibility: if step4 has passengers, use that; otherwise use step5
    const passengersData = step5Data || (step4Data?.passengers && step4Data?.passengerCount ? step4Data : null);

    // Additional validations - convert date strings to Date objects for validation
    const arrivalDateObj = new Date(step2Data.arrivalDate);
    const departureDateObj = new Date(step2Data.departureDate);
    if (!validateDateRange(arrivalDateObj, departureDateObj)) {
      return res.status(400).json({ error: 'Travel duration cannot exceed 80 days' });
    }

    // Type guard: ensure passengersData has required fields
    if (!passengersData) {
      return res.status(400).json({ error: 'Passenger data is required' });
    }
    
    if (!passengersData.passengerCount || !passengersData.passengers || passengersData.passengers.length === 0) {
      return res.status(400).json({ error: 'Passenger data is incomplete' });
    }
    
    // TypeScript type narrowing: at this point, we know passengersData has passengerCount and passengers
    const finalPassengerCount = passengersData.passengerCount;
    const finalPassengers = passengersData.passengers;

    if (step3Data.accommodationType === 'iqama' && finalPassengerCount > 5) {
      return res.status(400).json({ error: 'Maximum 5 passengers allowed for iqama accommodation' });
    }

    // Determine document requirements validation
    const hasGroupNumber = !!(step1Data.groupNumber && step1Data.groupName);
    const accommodationType = step3Data.accommodationType;

    // Validate documents based on booking mode
    if (hasGroupNumber && accommodationType) {
      const leadPassenger = finalPassengers.find(p => p.isLeadPassenger);
      if (!leadPassenger) {
        return res.status(400).json({ error: 'Lead passenger is required for bookings with group number' });
      }

      if (accommodationType === 'iqama') {
        if (!leadPassenger.documents?.panCardPhoto || !leadPassenger.documents?.iqamaPhoto) {
          return res.status(400).json({ error: 'PAN card and Iqama copy are required for lead passenger' });
        }
      } else if (accommodationType === 'hotel') {
        if (!leadPassenger.documents?.panCardPhoto || !leadPassenger.documents?.ticketCopy || !leadPassenger.documents?.hotelBooking) {
          return res.status(400).json({ error: 'PAN card, Ticket copy, and Hotel copy are required for lead passenger' });
        }
      }
    } else {
      // Regular booking validation
      const leadPassenger = finalPassengers.find(p => p.isLeadPassenger);
      if (!leadPassenger) {
        return res.status(400).json({ error: 'Lead passenger is required' });
      }

      if (!leadPassenger.documents?.panCardPhoto || !leadPassenger.documents?.passportFront || !leadPassenger.documents?.passportBack) {
        return res.status(400).json({ error: 'Lead passenger requires PAN card, passport front, and passport back' });
      }

      for (const passenger of finalPassengers.filter(p => !p.isLeadPassenger)) {
        if (!passenger.documents?.passportFront || !passenger.documents?.passportBack) {
          return res.status(400).json({ error: `Passport front and back required for ${passenger.fullName || 'passenger'}` });
        }
      }
    }

    // Determine initial status
    let initialStatus: 'pending' | 'group_assigned';
    if (!hasGroupNumber) {
      initialStatus = 'pending';
    } else {
      // If hasGroupNumber is true, always set to group_assigned (regardless of accommodation type)
      initialStatus = 'group_assigned';
    }

    // Calculate hasTransportation
    // Check for both single transport selection and multiple transport selection (for fulltrip routes)
    const hasTransportation = !!(step4Data?.selectedTransport?.transportId || 
      (step4Data?.selectedTransports && step4Data.selectedTransports.length > 0) ||
      (step2Data.transportBookings && step2Data.transportBookings.length > 0));

    // PRE-FETCH: Collect all unique IDs needed for LocationMaster lookups
    const allLocationIds = new Set<string>();
    const allCityIds = new Set<string>();
    
    // Add airport IDs
    if (step2Data.arrivalAirportId) allLocationIds.add(step2Data.arrivalAirportId);
    if (step2Data.departureAirportId) allLocationIds.add(step2Data.departureAirportId);
    
    // Add hotel IDs and location IDs from hotel bookings
    if (step3Data.accommodationType === 'hotel' && step3Data.hotelBookings) {
      step3Data.hotelBookings.forEach((hotel: any) => {
        if (hotel.hotelId) allLocationIds.add(hotel.hotelId);
        if (hotel.locationId) {
          // Could be LocationMaster ID or City ID
          allLocationIds.add(hotel.locationId);
          allCityIds.add(hotel.locationId);
        }
      });
    }

    // Batch query to fetch all LocationMasters before transaction
    const allLocationMasters = await prisma.locationMaster.findMany({
      where: {
        OR: [
          { id: { in: Array.from(allLocationIds) } },
          { cityId: { in: Array.from(allCityIds) } },
        ],
      },
      select: { id: true, cityId: true, locationType: true },
    });

    // Create lookup maps
    const locationMap = new Map<string, typeof allLocationMasters[0]>();
    const cityToLocationMap = new Map<string, typeof allLocationMasters[0][]>();

    allLocationMasters.forEach((lm) => {
      locationMap.set(lm.id, lm);
      if (lm.cityId) {
        if (!cityToLocationMap.has(lm.cityId)) {
          cityToLocationMap.set(lm.cityId, []);
        }
        cityToLocationMap.get(lm.cityId)!.push(lm);
      }
    });

    // Helper function to resolve location ID
    const resolveLocationId = (id: string, preferType?: string): string | null => {
      // First check if it's a LocationMaster ID
      if (locationMap.has(id)) {
        return id;
      }
      // Otherwise, check if it's a City ID
      const cityLocations = cityToLocationMap.get(id);
      if (cityLocations && cityLocations.length > 0) {
        if (preferType) {
          const preferred = cityLocations.find((l) => l.locationType === preferType);
          if (preferred) return preferred.id;
        }
        return cityLocations[0].id;
      }
      return null;
    };

    // Save everything in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create UmrahVisaBooking directly with partyId
      const booking = await tx.umrahVisaBooking.create({
        data: {
          partyId: validatedData.partyId,
          submittedAt: new Date(),
          groupNumber: step1Data.groupNumber,
          groupName: step1Data.groupName,
          hasGroupNumber,
          passengerCount: step2Data.passengerCount || finalPassengerCount,
          umrahVisaProviderId: step1Data.umrahVisaProviderId || null,
          status: initialStatus,
          visaType: 'individual_visa',
          accommodationType: step3Data.accommodationType,
          hasTransportation,
          lastUpdatedBy: user.id,
        },
      });

      // 3. Create UmrahTravelDetails - combine date and time before storing
      const arrivalDateTime = combineDateTime(step2Data.arrivalDate, step2Data.arrivalTime);
      const departureDateTime = combineDateTime(step2Data.departureDate, step2Data.departureTime);
      
      if (!arrivalDateTime || !departureDateTime) {
        throw new Error('Invalid arrival or departure date/time');
      }

      const travelDetails = await tx.umrahTravelDetails.create({
        data: {
          bookingId: booking.id,
          arrivalDateTime,
          arrivalAirportId: step2Data.arrivalAirportId,
          arrivalFlightNumber: step2Data.arrivalFlightNumber,
          departureDateTime,
          departureAirportId: step2Data.departureAirportId,
          departureFlightNumber: step2Data.departureFlightNumber,
        },
      });

      // 4. Create accommodation details based on type
      if (step3Data.accommodationType === 'hotel' && step3Data.hotelBookings) {
        // Create hotel bookings directly linked to booking
        await Promise.all(
          step3Data.hotelBookings.map(async (hotel) => {
            // Get hotel's LocationMaster from pre-fetched map
            const hotelLocation = locationMap.get(hotel.hotelId);
            if (!hotelLocation) {
              throw new Error(`Invalid hotelId ${hotel.hotelId} - hotel LocationMaster not found`);
            }

            // Resolve locationId using pre-fetched maps
            let locationMasterId: string | null = null;

            // First, try to resolve hotel.locationId (could be LocationMaster ID or City ID)
            if (hotel.locationId) {
              locationMasterId = resolveLocationId(hotel.locationId, 'OTHERS');
            }

            // If not resolved, use hotel's city to find a LocationMaster
            if (!locationMasterId && hotelLocation.cityId) {
              locationMasterId = resolveLocationId(hotelLocation.cityId, 'OTHERS');
            }

            // If still not found, throw error
            if (!locationMasterId) {
              throw new Error(`No LocationMaster found for hotel booking. Hotel: ${hotel.hotelId}, Location: ${hotel.locationId}`);
            }
            
            return tx.umrahHotelBooking.create({
              data: {
                bookingId: booking.id,
                locationId: locationMasterId,
                hotelId: hotel.hotelId,
                checkInDate: hotel.checkInDate,
                checkOutDate: hotel.checkOutDate,
              },
            });
          })
        );
      } else if (step3Data.accommodationType === 'iqama' && step3Data.iqamaDetails) {
        // Create sponsor iqama details
        await tx.umrahSponserIqamaDetails.create({
          data: {
            bookingId: booking.id,
            iqamaSponserName: step3Data.iqamaDetails.iqamaName || '',
            iqamaNumber: step3Data.iqamaDetails.iqamaNumber || '',
            sponserDob: step3Data.iqamaDetails.iqamaDob ? new Date(step3Data.iqamaDetails.iqamaDob) : new Date(),
            sponserMobileNumber: step3Data.iqamaDetails.iqamaMobile || '',
            sponserNationalShortAddress: step3Data.iqamaDetails.iqamaNationalShortAddress || '',
          },
        });
      }

      // 6. Create UmrahTransportBooking (if provided) - using new format with transportMasterId
      if (step4Data?.selectedTransport?.transportId) {
        await tx.umrahTransportBooking.create({
          data: {
            bookingId: booking.id,
            transportMasterId: step4Data.selectedTransport.transportId,
            travelDateTime: null, // Can be set later if needed
          },
        });
      } else if (step4Data?.selectedTransports && step4Data.selectedTransports.length > 0) {
        // Handle multiple transport selections (for fulltrip routes)
        // Create transport bookings for each selected transport with quantity
        for (const transport of step4Data.selectedTransports) {
          // Create one booking per quantity
          for (let i = 0; i < (transport.quantity || 1); i++) {
            await tx.umrahTransportBooking.create({
              data: {
                bookingId: booking.id,
                transportMasterId: transport.transportId,
                travelDateTime: null, // Can be set later if needed
              },
            });
          }
        }
      }

      // 6.5. Create UmrahMovementDetail entries (automatically from hotel bookings)
      // Movement details should be created for hotel bookings regardless of transport selection
      // They represent the route: airport → hotel 1 → hotel 2 → ... → airport
      if (step3Data.accommodationType === 'hotel' && step3Data.hotelBookings && step3Data.hotelBookings.length > 0) {
        const movementDetailsToCreate: Array<{
          bookingId: string;
          travelDateTime: Date;
          fromCityId: string;
          fromLocationId: string;
          toCityId: string;
          toLocationId: string;
        }> = [];

        // Get arrival and departure airports from pre-fetched maps
        const arrivalAirport = locationMap.get(step2Data.arrivalAirportId);
        const departureAirport = locationMap.get(step2Data.departureAirportId);

        if (!arrivalAirport || !departureAirport) {
          throw new Error('Invalid airport IDs');
        }

        // 1. Arrival Airport → First Hotel
        const firstHotel = step3Data.hotelBookings[0];
        const firstHotelLocation = locationMap.get(firstHotel.hotelId);

        if (firstHotelLocation && arrivalAirport.cityId && firstHotelLocation.cityId) {
          const arrivalDateTime = combineDateTime(step2Data.arrivalDate, step2Data.arrivalTime);
          if (arrivalDateTime) {
            movementDetailsToCreate.push({
              bookingId: booking.id,
              travelDateTime: arrivalDateTime,
              fromCityId: arrivalAirport.cityId,
              fromLocationId: arrivalAirport.id,
              toCityId: firstHotelLocation.cityId,
              toLocationId: firstHotelLocation.id,
            });
          }
        }

        // 2. Inter-hotel movements (Hotel 1 → Hotel 2, Hotel 2 → Hotel 3, etc.)
        for (let i = 1; i < step3Data.hotelBookings.length; i++) {
          const prevHotel = step3Data.hotelBookings[i - 1];
          const currHotel = step3Data.hotelBookings[i];

          const prevHotelLocation = locationMap.get(prevHotel.hotelId);
          const currHotelLocation = locationMap.get(currHotel.hotelId);

          if (prevHotelLocation && currHotelLocation && 
              prevHotelLocation.cityId && currHotelLocation.cityId &&
              prevHotelLocation.cityId !== currHotelLocation.cityId) {
            // Only create movement if hotels are in different cities
            const travelDate = currHotel.checkInDate;
            const travelDateTime = new Date(travelDate);
            travelDateTime.setHours(12, 0, 0, 0); // Default to noon

            movementDetailsToCreate.push({
              bookingId: booking.id,
              travelDateTime,
              fromCityId: prevHotelLocation.cityId,
              fromLocationId: prevHotelLocation.id,
              toCityId: currHotelLocation.cityId,
              toLocationId: currHotelLocation.id,
            });
          }
        }

        // 3. Last Hotel → Departure Airport
        const lastHotel = step3Data.hotelBookings[step3Data.hotelBookings.length - 1];
        const lastHotelLocation = locationMap.get(lastHotel.hotelId);

        if (lastHotelLocation && lastHotelLocation.cityId && departureAirport.cityId &&
            lastHotelLocation.cityId !== departureAirport.cityId) {
          // Only create movement if last hotel is in different city than departure airport
          const departureDateTime = combineDateTime(step2Data.departureDate, step2Data.departureTime);
          if (departureDateTime) {
            movementDetailsToCreate.push({
              bookingId: booking.id,
              travelDateTime: departureDateTime,
              fromCityId: lastHotelLocation.cityId,
              fromLocationId: lastHotelLocation.id,
              toCityId: departureAirport.cityId,
              toLocationId: departureAirport.id,
            });
          }
        }

        // Create all movement details
        if (movementDetailsToCreate.length > 0) {
          await Promise.all(
            movementDetailsToCreate.map((movement) =>
              tx.umrahMovementDetail.create({
                data: movement,
              })
            )
          );
        }
      }

      // 7. Create UmrahPassenger (all passengers)
      const passengers = await Promise.all(
        finalPassengers.map(passenger =>
          tx.umrahPassenger.create({
            data: {
              bookingId: booking.id,
              fullName: passenger.fullName,
              isLeadPassenger: hasGroupNumber ? (passenger.isLeadPassenger) : passenger.isLeadPassenger,
            },
          })
        )
      );

      // 8. Create BookingStatusHistory
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          oldStatus: null,
          newStatus: initialStatus,
          changedBy: user.id,
          reason: 'Booking created',
        },
      });

      return { booking, travelDetails, passengers };
    }, {
      maxWait: 10000,  // 10 seconds max wait
      timeout: 30000,  // 30 seconds timeout
    });

    res.status(201).json({
      message: 'Booking completed successfully',
      data: {
        bookingId: result.booking.id,
          passengerCount: finalPassengerCount,
          passengers: result.passengers,
          status: initialStatus,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('❌ Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// PATCH /api/umrah-visa/:bookingId/travel-details - Update travel details (dates/times/flight numbers)
router.patch('/:bookingId/travel-details', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const {
      arrivalDate,
      arrivalTime,
      arrivalFlightNumber,
      departureDate,
      departureTime,
      departureFlightNumber,
    } = req.body || {};

    // Combine date and time into datetime before storing
    const arrivalDateTime = arrivalDate && arrivalTime
      ? combineDateTime(arrivalDate, arrivalTime)
      : undefined;
    
    const departureDateTime = departureDate && departureTime
      ? combineDateTime(departureDate, departureTime)
      : undefined;

    // Get existing travel details to preserve values if not provided
    const existing = await prisma.umrahTravelDetails.findUnique({
      where: { bookingId },
    });

    const travel = await prisma.umrahTravelDetails.upsert({
      where: { bookingId },
      update: {
        arrivalDateTime: arrivalDateTime ?? existing?.arrivalDateTime,
        arrivalFlightNumber: arrivalFlightNumber ?? existing?.arrivalFlightNumber,
        departureDateTime: departureDateTime ?? existing?.departureDateTime,
        departureFlightNumber: departureFlightNumber ?? existing?.departureFlightNumber,
        arrivalAirportId: req.body?.arrivalAirportId ?? existing?.arrivalAirportId,
        departureAirportId: req.body?.departureAirportId ?? existing?.departureAirportId,
      },
      create: {
        bookingId,
        arrivalDateTime: arrivalDateTime ?? new Date(),
        arrivalFlightNumber: arrivalFlightNumber ?? '',
        departureDateTime: departureDateTime ?? new Date(),
        departureFlightNumber: departureFlightNumber ?? '',
        arrivalAirportId: req.body?.arrivalAirportId,
        departureAirportId: req.body?.departureAirportId,
      },
    });

    // Split datetime back to date and time for response (UI compatibility)
    const response = {
      ...travel,
      arrivalDate: splitDateTime(travel.arrivalDateTime)?.date,
      arrivalTime: splitDateTime(travel.arrivalDateTime)?.time,
      departureDate: splitDateTime(travel.departureDateTime)?.date,
      departureTime: splitDateTime(travel.departureDateTime)?.time,
    };

    res.json({ travelDetails: response });
  } catch (error) {
    console.error('Error updating travel details:', error);
    res.status(500).json({ error: 'Failed to update travel details' });
  }
});

// PATCH /api/umrah-visa/:bookingId/accommodation - Update iqama fields and hotel booking dates
router.patch('/:bookingId/accommodation', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { accommodationType, iqamaSponserName, iqamaNumber, sponserDob, sponserMobileNumber, sponserNationalShortAddress, hotelBookings } = req.body || {};

    // Get booking to check accommodation type
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      select: { accommodationType: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update based on accommodation type
    if (booking.accommodationType === 'iqama') {
      // Update or create sponsor iqama details
      const sponsorIqama = await prisma.umrahSponserIqamaDetails.upsert({
        where: { bookingId },
        update: {
          iqamaSponserName: iqamaSponserName ?? undefined,
          iqamaNumber: iqamaNumber ?? undefined,
          sponserDob: sponserDob ? new Date(sponserDob) : undefined,
          sponserMobileNumber: sponserMobileNumber ?? undefined,
          sponserNationalShortAddress: sponserNationalShortAddress ?? undefined,
        },
        create: {
          bookingId,
          iqamaSponserName: iqamaSponserName || '',
          iqamaNumber: iqamaNumber || '',
          sponserDob: sponserDob ? new Date(sponserDob) : new Date(),
          sponserMobileNumber: sponserMobileNumber || '',
          sponserNationalShortAddress: sponserNationalShortAddress || '',
        },
      });

      return res.json({ sponsorIqamaDetails: sponsorIqama });
    } else if (booking.accommodationType === 'hotel') {
      // Update hotel bookings
      if (Array.isArray(hotelBookings)) {
        for (const h of hotelBookings) {
          if (!h?.id) continue;
          await prisma.umrahHotelBooking.update({
            where: { id: h.id },
            data: {
              checkInDate: h.checkInDate ? new Date(h.checkInDate) : undefined,
              checkOutDate: h.checkOutDate ? new Date(h.checkOutDate) : undefined,
            },
          });
        }
      }

      const refreshed = await prisma.umrahHotelBooking.findMany({
        where: { bookingId },
        include: { hotel: true, location: true },
        orderBy: { checkInDate: 'asc' },
      });

      return res.json({ hotelBookings: refreshed });
    }

    res.json({ message: 'No accommodation details to update' });
  } catch (error) {
    console.error('Error updating accommodation:', error);
    res.status(500).json({ error: 'Failed to update accommodation' });
  }
});

// PATCH /api/umrah-visa/:bookingId/passengers - Bulk update passenger fields
router.patch('/:bookingId/passengers', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { passengers } = req.body || {};
    if (Array.isArray(passengers)) {
      for (const p of passengers) {
        if (!p?.id) continue;
        await prisma.umrahPassenger.update({
          where: { id: p.id },
          data: {
            fullName: p.fullName ?? undefined,
            // Optional additional fields as needed
          },
        });
      }
    }

    const refreshed = await prisma.umrahPassenger.findMany({ where: { bookingId } });
    res.json({ passengers: refreshed });
  } catch (error) {
    console.error('Error updating passengers:', error);
    res.status(500).json({ error: 'Failed to update passengers' });
  }
});

export default router;

