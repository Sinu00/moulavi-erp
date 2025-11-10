import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import {
  prisma,
  validateDateRange,
  step2Schema,
  step3Schema,
  step4Schema,
  FLIGHT_NUMBER_REGEX,
} from './umrahVisa/shared';
import { combineDateTime, splitDateTime } from '../utils/datetime';

const router = Router();

// Individual Step 1 schema - specific to individual visa
const step1Schema = z.object({
  bookingMode: z.enum(['group_number', 'travel_details']),
  groupNumber: z.string().optional(),
  groupName: z.string().optional(),
}).refine((data) => {
  if (data.bookingMode === 'group_number') {
    return data.groupNumber && data.groupName;
  }
  return true;
}, {
  message: "Group number and group name are required when booking mode is 'group_number'",
  path: ["groupNumber"]
});

// Complete booking schema - combines all steps
const completeBookingSchema = z.object({
  partyId: z.string().uuid(),
  step1: step1Schema,
  step2: step2Schema,
  step3: step3Schema,
  step4: step4Schema,
});

// POST /api/umrah-visa/step1 - Step 1: Validation Only (No DB writes)
router.post('/step1', authenticate, async (req, res) => {
  try {
    const { partyId } = req.body;
    const validatedData = step1Schema.parse(req.body);

    if (!partyId) {
      return res.status(400).json({ error: 'Party ID is required' });
    }

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
    const step4Data = validatedData.step4;

    // Additional validations - convert date strings to Date objects for validation
    const arrivalDateObj = new Date(step2Data.arrivalDate);
    const departureDateObj = new Date(step2Data.departureDate);
    if (!validateDateRange(arrivalDateObj, departureDateObj)) {
      return res.status(400).json({ error: 'Travel duration cannot exceed 80 days' });
    }

    if (step3Data.accommodationType === 'iqama' && step4Data.passengerCount > 5) {
      return res.status(400).json({ error: 'Maximum 5 passengers allowed for iqama accommodation' });
    }

    // Determine document requirements validation
    const hasGroupNumber = !!(step1Data.groupNumber && step1Data.groupName);
    const accommodationType = step3Data.accommodationType;

    // Validate documents based on booking mode
    if (hasGroupNumber && accommodationType) {
      const leadPassenger = step4Data.passengers.find(p => p.isLeadPassenger);
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
      const leadPassenger = step4Data.passengers.find(p => p.isLeadPassenger);
      if (!leadPassenger) {
        return res.status(400).json({ error: 'Lead passenger is required' });
      }

      if (!leadPassenger.documents?.panCardPhoto || !leadPassenger.documents?.passportFront || !leadPassenger.documents?.passportBack) {
        return res.status(400).json({ error: 'Lead passenger requires PAN card, passport front, and passport back' });
      }

      for (const passenger of step4Data.passengers.filter(p => !p.isLeadPassenger)) {
        if (!passenger.documents?.passportFront || !passenger.documents?.passportBack) {
          return res.status(400).json({ error: `Passport front and back required for ${passenger.fullName || 'passenger'}` });
        }
      }
    }

    // Determine initial status
    let initialStatus: 'pending' | 'group_assigned' | 'voucher';
    if (!hasGroupNumber) {
      initialStatus = 'pending';
    } else if (accommodationType === 'iqama') {
      initialStatus = 'group_assigned';
    } else if (accommodationType === 'hotel') {
      initialStatus = 'voucher';
    } else {
      initialStatus = 'pending';
    }

    // Calculate hasTransportation
    const hasTransportation = step2Data.transportBookings && step2Data.transportBookings.length > 0;

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
          passengerCount: step4Data.passengerCount,
          status: initialStatus,
          visaType: 'individual_visa',
          accommodationType: step3Data.accommodationType,
          hasTransportation,
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
          step3Data.hotelBookings.map(hotel =>
            tx.umrahHotelBooking.create({
              data: {
                bookingId: booking.id,
                locationId: hotel.locationId,
                hotelId: hotel.hotelId,
                checkInDate: hotel.checkInDate,
                checkOutDate: hotel.checkOutDate,
              },
            })
          )
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

      // 6. Create UmrahTransportBooking (if provided) - combine date and time before storing
      if (step2Data.transportBookings && step2Data.transportBookings.length > 0) {
        await Promise.all(
          step2Data.transportBookings.map(transport => {
            const travelDateTime = transport.travelDate && transport.travelTime
              ? combineDateTime(transport.travelDate, transport.travelTime)
              : undefined;
            
            return tx.umrahTransportBooking.create({
              data: {
                bookingId: booking.id,
                fromLocationId: transport.fromLocationId,
                toLocationId: transport.toLocationId,
                fromSpecificLocationId: (transport as any).fromHotelId || null,
                toSpecificLocationId: (transport as any).toHotelId || null,
                vehicleType: transport.vehicleType,
                paxCount: transport.paxCount,
                price: transport.price,
                travelDateTime,
              },
            });
          })
        );
      }

      // 7. Create UmrahPassenger (all passengers)
      const passengers = await Promise.all(
        step4Data.passengers.map(passenger =>
          tx.umrahPassenger.create({
            data: {
              bookingId: booking.id,
              fullName: passenger.fullName,
              isLeadPassenger: hasGroupNumber ? (passenger.isLeadPassenger) : passenger.isLeadPassenger,
            },
          })
        )
      );

      // 8. Get party name for TripInfo
      const party = await tx.party.findUnique({
        where: { id: validatedData.partyId },
        select: { partyName: true },
      });

      // 9. Get sponsor iqama details if exists
      const sponsorIqamaDetails = await tx.umrahSponserIqamaDetails.findUnique({
        where: { bookingId: booking.id },
      });

      // 10. Create TripInfo
      const tripInfo = await tx.tripInfo.create({
        data: {
          bookingId: booking.id,
          groupNumber: booking.groupNumber,
          groupName: booking.groupName,
          partyName: party?.partyName || '',
          arrivalDate: travelDetails.arrivalDateTime,
          departureDate: travelDetails.departureDateTime,
          iqamaNumber: sponsorIqamaDetails?.iqamaNumber || null,
          iqamaHolderName: sponsorIqamaDetails?.iqamaSponserName || null,
          iqamaHolderDob: sponsorIqamaDetails?.sponserDob || null,
          iqamaHolderMobile: sponsorIqamaDetails?.sponserMobileNumber || null,
          iqamaNationalShortAddress: sponsorIqamaDetails?.sponserNationalShortAddress || null,
          updatedBy: user.id,
          status: initialStatus,
        },
      });

      // 11. Create BookingStatusHistory
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          oldStatus: null,
          newStatus: initialStatus,
          changedBy: user.id,
          reason: 'Booking created',
        },
      });

      return { booking, travelDetails, passengers, tripInfo };
    });

    res.status(201).json({
      message: 'Booking completed successfully',
      data: {
        bookingId: result.booking.id,
        passengerCount: step4Data.passengerCount,
        passengers: result.passengers,
        tripInfo: result.tripInfo,
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

