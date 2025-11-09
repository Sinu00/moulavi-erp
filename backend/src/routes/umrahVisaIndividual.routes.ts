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

    // Validate date range (80 days max)
    if (!validateDateRange(validatedData.arrivalDate, validatedData.departureDate)) {
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

    // Additional validations
    if (!validateDateRange(step2Data.arrivalDate, step2Data.departureDate)) {
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

      // 3. Create UmrahTravelDetails
      const travelDetails = await tx.umrahTravelDetails.create({
        data: {
          bookingId: booking.id,
          arrivalDate: step2Data.arrivalDate,
          arrivalTime: step2Data.arrivalTime,
          arrivalAirportId: step2Data.arrivalAirportId,
          arrivalFlightNumber: step2Data.arrivalFlightNumber,
          departureDate: step2Data.departureDate,
          departureTime: step2Data.departureTime,
          departureAirportId: step2Data.departureAirportId,
          departureFlightNumber: step2Data.departureFlightNumber,
        },
      });

      // 4. Create UmrahAccommodationDetails
      const accommodationDetails = await tx.umrahAccommodationDetails.create({
        data: {
          bookingId: booking.id,
          accommodationType: step3Data.accommodationType,
          iqamaNumber: step3Data.iqamaDetails?.iqamaNumber,
          iqamaName: step3Data.iqamaDetails?.iqamaName,
          iqamaDob: step3Data.iqamaDetails?.iqamaDob,
          iqamaMobile: step3Data.iqamaDetails?.iqamaMobile,
        },
      });

      // 5. Create UmrahHotelBooking (if hotel)
      if (step3Data.accommodationType === 'hotel' && step3Data.hotelBookings) {
        await Promise.all(
          step3Data.hotelBookings.map(hotel =>
            tx.umrahHotelBooking.create({
              data: {
                accommodationId: accommodationDetails.id,
                locationId: hotel.locationId,
                hotelId: hotel.hotelId,
                checkInDate: hotel.checkInDate,
                checkOutDate: hotel.checkOutDate,
              },
            })
          )
        );
      }

      // 6. Create UmrahTransportBooking (if provided)
      if (step2Data.transportBookings && step2Data.transportBookings.length > 0) {
        await Promise.all(
          step2Data.transportBookings.map(transport =>
            tx.umrahTransportBooking.create({
              data: {
                bookingId: booking.id,
                fromLocationId: transport.fromLocationId,
                toLocationId: transport.toLocationId,
                fromSpecificLocationId: (transport as any).fromHotelId || null,
                toSpecificLocationId: (transport as any).toHotelId || null,
                vehicleType: transport.vehicleType,
                paxCount: transport.paxCount,
                price: transport.price,
                travelDate: transport.travelDate,
                travelTime: transport.travelTime,
              },
            })
          )
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

      // 9. Create TripInfo
      const tripInfo = await tx.tripInfo.create({
        data: {
          bookingId: booking.id,
          groupNumber: booking.groupNumber,
          groupName: booking.groupName,
          partyName: party?.partyName || '',
          arrivalDate: travelDetails.arrivalDate,
          departureDate: travelDetails.departureDate,
          iqamaNumber: accommodationDetails.iqamaNumber,
          iqamaHolderName: accommodationDetails.iqamaName,
          iqamaHolderDob: accommodationDetails.iqamaDob,
          iqamaHolderMobile: accommodationDetails.iqamaMobile,
          updatedBy: user.id,
          status: initialStatus,
        },
      });

      // 10. Create BookingStatusHistory
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          oldStatus: null,
          newStatus: initialStatus,
          changedBy: user.id,
          reason: 'Booking created',
        },
      });

      return { booking, travelDetails, accommodationDetails, passengers, tripInfo };
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

    // Convert time strings (HH:mm) to Date objects if they are strings
    let arrivalTimeDate: Date | undefined = undefined;
    if (arrivalTime) {
      if (typeof arrivalTime === 'string' && arrivalTime.includes(':')) {
        // Time is in HH:mm format, combine with today's date
        const today = new Date();
        const [hours, minutes] = arrivalTime.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        arrivalTimeDate = today;
      } else if (arrivalTime instanceof Date) {
        arrivalTimeDate = arrivalTime;
      } else {
        arrivalTimeDate = new Date(arrivalTime);
      }
    }

    let departureTimeDate: Date | undefined = undefined;
    if (departureTime) {
      if (typeof departureTime === 'string' && departureTime.includes(':')) {
        // Time is in HH:mm format, combine with today's date
        const today = new Date();
        const [hours, minutes] = departureTime.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        departureTimeDate = today;
      } else if (departureTime instanceof Date) {
        departureTimeDate = departureTime;
      } else {
        departureTimeDate = new Date(departureTime);
      }
    }

    const travel = await prisma.umrahTravelDetails.upsert({
      where: { bookingId },
      update: {
        arrivalDate: arrivalDate ? new Date(arrivalDate) : undefined,
        arrivalTime: arrivalTimeDate,
        arrivalFlightNumber: arrivalFlightNumber ?? undefined,
        departureDate: departureDate ? new Date(departureDate) : undefined,
        departureTime: departureTimeDate,
        departureFlightNumber: departureFlightNumber ?? undefined,
      },
      create: {
        bookingId,
        arrivalDate: arrivalDate ? new Date(arrivalDate) : new Date(),
        arrivalTime: arrivalTimeDate ?? new Date(),
        arrivalFlightNumber: arrivalFlightNumber ?? '',
        departureDate: departureDate ? new Date(departureDate) : new Date(),
        departureTime: departureTimeDate ?? new Date(),
        departureFlightNumber: departureFlightNumber ?? '',
        arrivalAirportId: req.body?.arrivalAirportId ?? undefined,
        departureAirportId: req.body?.departureAirportId ?? undefined,
      },
    });

    res.json({ travelDetails: travel });
  } catch (error) {
    console.error('Error updating travel details:', error);
    res.status(500).json({ error: 'Failed to update travel details' });
  }
});

// PATCH /api/umrah-visa/:bookingId/accommodation - Update iqama fields and hotel booking dates
router.patch('/:bookingId/accommodation', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { accommodationType, iqamaNumber, iqamaName, iqamaDob, iqamaMobile, hotelBookings } = req.body || {};

    const acc = await prisma.umrahAccommodationDetails.upsert({
      where: { bookingId },
      update: {
        accommodationType: accommodationType ?? undefined,
        iqamaNumber: iqamaNumber ?? undefined,
        iqamaName: iqamaName ?? undefined,
        iqamaDob: iqamaDob ?? undefined,
        iqamaMobile: iqamaMobile ?? undefined,
      },
      create: {
        bookingId,
        accommodationType: accommodationType ?? 'hotel',
        iqamaNumber: iqamaNumber ?? null,
        iqamaName: iqamaName ?? null,
        iqamaDob: iqamaDob ?? null,
        iqamaMobile: iqamaMobile ?? null,
      },
      include: { hotelBookings: true },
    });

    if (Array.isArray(hotelBookings)) {
      for (const h of hotelBookings) {
        if (!h?.id) continue;
        await prisma.umrahHotelBooking.update({
          where: { id: h.id },
          data: {
            checkInDate: h.checkInDate ?? undefined,
            checkOutDate: h.checkOutDate ?? undefined,
          },
        });
      }
    }

    const refreshed = await prisma.umrahAccommodationDetails.findUnique({
      where: { bookingId },
      include: { hotelBookings: { include: { hotel: true, location: true } } },
    });

    res.json({ accommodationDetails: refreshed });
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

