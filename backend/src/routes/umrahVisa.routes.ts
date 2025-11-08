import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';
import { AuditService } from '../services/auditService';
import { generateVoucherNumber, generateRouteNumbers, formatTime, formatDate } from '../services/voucherService';
import { ensureTripInfoExists, syncBookingAndTripInfoStatus, syncBookingAndTripInfoStatusInTx } from '../services/statusSyncService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/umrah-visa';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for ZIP files
  fileFilter: (req, file, cb) => {
    // Allow ZIP files for group bookings
    if (file.fieldname === 'panCardZipFile') {
      const allowedTypes = /zip|application\/zip|application\/x-zip-compressed/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype || extname || file.originalname.toLowerCase().endsWith('.zip')) {
        return cb(null, true);
      } else {
        cb(new Error('Only ZIP files are allowed for PAN card upload'));
      }
      return;
    }
    
    // For other files, use existing validation
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, JPG, PNG) and PDF files are allowed'));
    }
  }
});

// GET /api/umrah-visa/bookings - Get all bookings with pagination and filters
router.get('/bookings', authenticate, async (req, res) => {
  try {
    const { page = '1', limit = '10', status, partyId } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get the authenticated user
    const user = (req as any).user;

    const where: any = {};
    
    // If user is a party, automatically filter by their partyId
    if (user && user.role === 'party') {
      // Find the party associated with this user
      const userParty = await prisma.party.findUnique({
        where: { userId: user.id },
        select: { id: true }
      });
      
      if (userParty) {
        where.service = {
          partyId: userParty.id,
        };
      } else {
        // If no party found for this user, return empty results
        return res.json({
          bookings: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0,
          },
        });
      }
    }
    // If admin/staff and partyId is provided, filter by that partyId
    else if (partyId) {
      where.service = {
        partyId: partyId,
      };
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }

    const [bookings, total] = await Promise.all([
      prisma.umrahVisaBooking.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          service: {
            include: {
              party: {
                select: {
                  id: true,
                  partyName: true,
                  email: true,
                  contactNumber: true,
                },
              },
            },
          },
          travelDetails: {
            include: {
              arrivalAirport: true,
              departureAirport: true,
            },
          },
          accommodationDetails: true,
          passengers: {
            include: {
              documents: true,
            },
          },
          tripInfo: {
            include: {
              updatedByUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              documentsDownloadedByUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.umrahVisaBooking.count({ where }),
    ]);

    res.json({
      bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Flight number validation regex: 2 letters + dash + up to 4 numbers (e.g., SV-1234)
const FLIGHT_NUMBER_REGEX = /^[A-Z]{2}-\d{1,4}$/;

// Validation schemas for each step
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

// Group booking validation schemas
const groupStep1Schema = z.object({
  groupNumber: z.string().min(1, 'Group number is required'),
  groupName: z.string().min(1, 'Group name is required'),
  passengerCount: z.number().min(1, 'Passenger count must be at least 1').max(50, 'Passenger count cannot exceed 50'),
  umrahVisaProviderId: z.string().uuid('Valid umrah visa provider ID is required').optional(),
});

const step2Schema = z.object({
  arrivalDate: z.string().transform((str) => new Date(str)),
  arrivalTime: z.string().transform((str) => {
    // Convert time string to DateTime (using today's date with the time)
    const today = new Date();
    const [hours, minutes] = str.split(':');
    today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return today;
  }),
  arrivalAirportId: z.string().uuid(),
  arrivalFlightNumber: z.string().regex(FLIGHT_NUMBER_REGEX, 'Flight number must be in format: XX-1234'),
  departureDate: z.string().transform((str) => new Date(str)),
  departureTime: z.string().transform((str) => {
    // Convert time string to DateTime (using today's date with the time)
    const today = new Date();
    const [hours, minutes] = str.split(':');
    today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return today;
  }),
  departureAirportId: z.string().uuid(),
  departureFlightNumber: z.string().regex(FLIGHT_NUMBER_REGEX, 'Flight number must be in format: XX-1234'),
  transportBookings: z.array(z.object({
    fromLocationId: z.string().uuid(),
    toLocationId: z.string().uuid(),
    vehicleType: z.string(),
    paxCount: z.number().min(1),
    price: z.number().min(0),
    travelDate: z.string().transform((str) => new Date(str)).optional(),
    travelTime: z.string().transform((str) => {
      // Convert time string to DateTime (using today's date with the time)
      const today = new Date();
      const [hours, minutes] = str.split(':');
      today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return today;
    }).optional(),
  })).optional(),
  hotelBookings: z.array(z.object({
    locationId: z.string().uuid(),
    hotelId: z.string().uuid(),
    checkInDate: z.string().transform((str) => new Date(str)),
    checkOutDate: z.string().transform((str) => new Date(str)),
    brn: z.array(z.string()).optional(),
  })).optional(),
});

const step3Schema = z.object({
  accommodationType: z.enum(['hotel', 'iqama']),
  passengerCount: z.number().min(1).max(50).optional(), // Made optional since it comes in Step 4
  iqamaDetails: z.object({
    iqamaNumber: z.string().optional(),
    iqamaName: z.string().optional(),
    iqamaDob: z.string().transform((str) => new Date(str)).optional(),
    iqamaMobile: z.string().optional(),
  }).optional(),
  hotelBookings: z.array(z.object({
    locationId: z.string().uuid(),
    hotelId: z.string().uuid(),
    checkInDate: z.string().transform((str) => new Date(str)),
    checkOutDate: z.string().transform((str) => new Date(str)),
    brn: z.array(z.string()).optional(),
  })).optional(),
}).refine((data) => {
  if (data.accommodationType === 'iqama' && data.passengerCount && data.passengerCount > 5) {
    return false;
  }
  return true;
}, {
  message: "Maximum 5 passengers allowed for iqama accommodation",
  path: ["passengerCount"]
});

const step4Schema = z.object({
  passengerCount: z.number().min(1).max(50),
  passengers: z.array(z.object({
    fullName: z.string().min(1).max(255),
    isLeadPassenger: z.boolean().default(false),
    documents: z.object({
      panCardPhoto: z.any().optional(),
      passportFront: z.any().optional(),
      passportBack: z.any().optional(),
      iqamaPhoto: z.any().optional(),
      hotelBooking: z.any().optional(),
      ticketCopy: z.any().optional(),
    }).optional(),
  })),
});

// Helper function to validate date range (80 days max)
const validateDateRange = (arrivalDate: Date, departureDate: Date) => {
  const diffTime = Math.abs(departureDate.getTime() - arrivalDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 80;
};

// Helper function to find city by name with spelling variations
const findCityByName = async (cityName: string) => {
  const cityVariations = [cityName];
  if (cityName === 'Medina') cityVariations.push('Madinah');
  if (cityName === 'Madinah') cityVariations.push('Medina');
  if (cityName === 'Mecca') cityVariations.push('Makkah');
  if (cityName === 'Makkah') cityVariations.push('Mecca');
  
  return await prisma.cityMaster.findFirst({
    where: {
      name: { in: cityVariations },
      isActive: true,
    },
  });
};

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

// Complete booking schema - combines all steps
const completeBookingSchema = z.object({
  partyId: z.string().uuid(),
  step1: step1Schema,
  step2: step2Schema,
  step3: step3Schema,
  step4: step4Schema,
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
      // 1. Create Service
      const service = await tx.service.create({
        data: {
          serviceType: 'umrah_visa',
          partyId: validatedData.partyId,
          status: 'completed',
        },
      });

      // 2. Create UmrahVisaBooking
      const booking = await tx.umrahVisaBooking.create({
        data: {
          serviceId: service.id,
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

      return { booking, service, travelDetails, accommodationDetails, passengers, tripInfo };
    });

    res.status(201).json({
      message: 'Booking completed successfully',
      data: {
        bookingId: result.booking.id,
        serviceId: result.service.id,
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


// GET /api/umrah-visa/:bookingId - Get complete booking details
router.get('/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID format' });
    }

    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        service: {
          include: {
            party: true,
          },
        },
        travelDetails: {
          include: {
            arrivalAirport: true,
            departureAirport: true,
          },
        },
        accommodationDetails: {
          include: {
            hotelBookings: {
              include: {
                location: true,
                hotel: true,
              },
            },
          },
        },
        transportBookings: {
          include: {
            fromLocation: true,
            toLocation: true,
          },
        },
        passengers: {
          include: {
            documents: true,
          },
        },
        statusHistory: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            changedAt: 'desc',
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
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

// PATCH /api/umrah-visa/:bookingId/transport-bookings - Bulk update transport rows
router.patch('/:bookingId/transport-bookings', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { transportBookings } = req.body || {};
    if (Array.isArray(transportBookings)) {
      for (const t of transportBookings) {
        if (!t?.id) continue;
        await prisma.umrahTransportBooking.update({
          where: { id: t.id },
          data: {
            travelDate: t.travelDate ?? undefined,
            travelTime: t.travelTime ? (typeof t.travelTime === 'string' ? new Date(`2000-01-01T${t.travelTime}`) : t.travelTime) : undefined,
            vehicleType: t.vehicleType ?? undefined,
            paxCount: t.paxCount ?? undefined,
            price: t.price ?? undefined,
          },
        });
      }
    }

    const refreshed = await prisma.umrahTransportBooking.findMany({
      where: { bookingId },
      include: { fromLocation: true, toLocation: true },
    });
    res.json({ transportBookings: refreshed });
  } catch (error) {
    console.error('Error updating transport bookings:', error);
    res.status(500).json({ error: 'Failed to update transport bookings' });
  }
});

// POST /api/umrah-visa/:bookingId/transport-bookings - create transport row
router.post('/:bookingId/transport-bookings', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { fromLocationId, toLocationId, vehicleType, paxCount, price, travelDate } = req.body || {};
    const created = await prisma.umrahTransportBooking.create({
      data: {
        bookingId,
        fromLocationId,
        toLocationId,
        vehicleType,
        paxCount,
        price,
        travelDate,
      },
      include: { fromLocation: true, toLocation: true },
    });
    res.json({ transportBooking: created });
  } catch (error) {
    console.error('Error creating transport booking:', error);
    res.status(500).json({ error: 'Failed to create transport booking' });
  }
});

// DELETE /api/umrah-visa/transport-bookings/:id - delete transport row
router.delete('/transport-bookings/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.umrahTransportBooking.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting transport booking:', error);
    res.status(500).json({ error: 'Failed to delete transport booking' });
  }
});

// POST /api/umrah-visa/:bookingId/hotel-bookings - create hotel booking row
router.post('/:bookingId/hotel-bookings', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { locationId, hotelId, checkInDate, checkOutDate } = req.body || {};
    const acc = await prisma.umrahAccommodationDetails.findUnique({ where: { bookingId } });
    if (!acc) return res.status(400).json({ error: 'Accommodation not initialized for this booking' });

    const created = await prisma.umrahHotelBooking.create({
      data: {
        accommodationId: acc.id,
        locationId,
        hotelId,
        checkInDate,
        checkOutDate,
      },
      include: { hotel: true, location: true },
    });
    res.json({ hotelBooking: created });
  } catch (error) {
    console.error('Error creating hotel booking:', error);
    res.status(500).json({ error: 'Failed to create hotel booking' });
  }
});

// DELETE /api/umrah-visa/hotel-bookings/:id - delete hotel booking row
router.delete('/hotel-bookings/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.umrahHotelBooking.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting hotel booking:', error);
    res.status(500).json({ error: 'Failed to delete hotel booking' });
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

// GET /api/umrah-visa/transport-options/:airportId - Get transport options for airport
router.get('/transport-options/:airportId', authenticate, async (req, res) => {
  try {
    const { airportId } = req.params;

    // Get airport details from LocationMaster
    const airport = await prisma.locationMaster.findUnique({
      where: { 
        id: airportId,
        locationType: 'AIRPORT',
      },
    });

    if (!airport) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    // Check if this airport requires transport selection
    const needsTransport = ['JED', 'MED'].includes(airport.code);

    if (!needsTransport) {
      return res.json({
        requiresTransport: false,
        transportOptions: [],
      });
    }

    // Find the city that matches the airport's city
    const fromCity = await findCityByName(airport.city);

    if (!fromCity) {
      console.warn(`No city found for airport city: ${airport.city}`);
      return res.json({
        requiresTransport: true,
        airport,
        transportOptions: [],
        message: `No city found for airport city: ${airport.city}`,
      });
    }

    // Get available transport options FROM this airport or any location in the city
    // Use the airport itself as the from location since transport routes are between locations
    const transportOptions = await prisma.transportMaster.findMany({
      where: {
        fromLocationId: airport.id, // Use the airport itself as the from location
        isActive: true,
      },
      include: {
        fromLocation: true,
        toLocation: true,
        vehicleType: true,
      },
      orderBy: [
        { toLocation: { name: 'asc' } },
        { vehicleType: { vehicleName: 'asc' } },
      ],
    });

    res.json({
      requiresTransport: true,
      airport,
      fromCity: fromCity,
      transportOptions,
    });
  } catch (error) {
    console.error('Error fetching transport options:', error);
    res.status(500).json({ error: 'Failed to fetch transport options' });
  }
});

// Masters: GET destinations (locations) - Now uses LocationMaster only
router.get('/masters/destinations', authenticate, async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    
    // Use CityMaster instead of DESTINATION locations
    const cityRows = await prisma.cityMaster.findMany({
      where: {
        isActive: true,
        ...(q ? { 
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
          ]
        } : {}),
      },
      orderBy: { name: 'asc' },
      take: 100,
      include: {
        country: {
          select: {
            id: true,
            countryCode: true,
            countryName: true,
          },
        },
      },
    });
    
    // Convert to old format for backward compatibility
    const destinations = cityRows.map(city => ({
      id: city.id,
      destinationCode: city.name.substring(0, 3).toUpperCase(),
      destinationName: city.name,
      city: city.name,
      country: city.country?.countryName || 'Saudi Arabia',
      isActive: city.isActive,
      createdAt: city.createdAt,
      updatedAt: city.updatedAt,
    }));
    
    res.json({ 
      destinations, // Backward compatible format
      cities: cityRows, // New city master format
    });
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({ error: 'Failed to fetch destinations' });
  }
});

// Masters: GET locations (unified LocationMaster - all types or filtered)
router.get('/masters/locations', authenticate, async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const locationType = req.query.locationType as string | undefined;
    
    const where: any = {
      isActive: true,
    };
    
    if (locationType) {
      where.locationType = locationType as any;
    }
    
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }
    
    const locations = await prisma.locationMaster.findMany({
      where,
      orderBy: [{ locationType: 'asc' }, { name: 'asc' }],
      take: 100,
      include: {
        country: {
          select: {
            id: true,
            countryCode: true,
            countryName: true,
          },
        },
      },
    });
    
    res.json({ locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Masters: GET hotels by city
router.get('/masters/hotels', authenticate, async (req, res) => {
  try {
    const cityId = req.query.cityId as string | undefined;
    const q = (req.query.q as string) || '';
    const rows = await prisma.locationMaster.findMany({
      where: {
        locationType: 'HOTEL',
        isActive: true,
        ...(cityId ? { cityId } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      take: 100,
      include: {
          cityMaster: {
            select: {
              id: true,
              name: true,
            },
          },
        country: {
          select: {
            id: true,
            countryCode: true,
            countryName: true,
          },
        },
      },
    });
    res.json({ hotels: rows });
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

// Masters: GET airports
router.get('/masters/airports', authenticate, async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const rows = await prisma.locationMaster.findMany({
      where: {
        locationType: 'AIRPORT',
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      take: 100,
    });
    res.json({ airports: rows });
  } catch (error) {
    console.error('Error fetching airports:', error);
    res.status(500).json({ error: 'Failed to fetch airports' });
  }
});

// GET /api/umrah-visa/hotels/:cityId - Get hotels by city
router.get('/hotels/:cityId', authenticate, async (req, res) => {
  try {
    const { cityId } = req.params;

    const hotels = await prisma.locationMaster.findMany({
      where: {
        cityId: cityId,
        locationType: 'HOTEL',
        isActive: true,
      },
      include: {
          cityMaster: {
            select: {
              id: true,
              name: true,
            },
          },
        country: {
          select: {
            id: true,
            countryCode: true,
            countryName: true,
          },
        },
      },
      orderBy: [
        { name: 'asc' },
      ],
    });

    res.json(hotels);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

// ============================================
// TRIP INFO & WORKFLOW ENDPOINTS
// ============================================

// POST /api/umrah-visa/:bookingId/add-group-data - Add group data (Admin/Staff only)
router.post('/:bookingId/add-group-data', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can add group data
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can add group data' });
    }

    const { groupNumber, groupName } = req.body;

    if (!groupNumber || !groupName) {
      return res.status(400).json({ error: 'Group number and group name are required' });
    }

    // Check if booking exists
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: { tripInfo: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.tripInfo) {
      return res.status(404).json({ error: 'Trip info not found' });
    }

    if (booking.tripInfo.status !== 'documents_downloaded') {
      return res.status(400).json({ error: 'Group data can only be added when status is documents_downloaded' });
    }

    // Determine next status based on accommodation type
    let nextStatus: 'group_assigned' | 'voucher';
    if (booking.accommodationType === 'iqama') {
      nextStatus = 'group_assigned';
    } else if (booking.accommodationType === 'hotel') {
      nextStatus = 'voucher';
    } else {
      return res.status(400).json({ error: 'Accommodation type not set for this booking' });
    }

    // Update booking and trip info - use sync function to ensure status consistency
    const [updatedBooking, updatedTripInfo] = await prisma.$transaction([
      prisma.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          groupNumber,
          groupName,
          hasGroupNumber: true,
        },
      }),
      prisma.tripInfo.update({
        where: { bookingId },
        data: {
          groupNumber,
          groupName,
          updatedBy: user.id,
        },
      }),
    ]);

    // Sync status separately (handles both booking and tripInfo status + history)
    await syncBookingAndTripInfoStatus(bookingId, nextStatus, user.id, 'Group data added');
    
    // Re-fetch updated records
    const finalBooking = await prisma.umrahVisaBooking.findUnique({ where: { id: bookingId } });
    const finalTripInfo = await prisma.tripInfo.findUnique({ where: { bookingId } });

    res.json({
      message: 'Group data added successfully',
      data: {
        booking: finalBooking,
        tripInfo: finalTripInfo,
      },
    });
  } catch (error) {
    console.error('Error adding group data:', error);
    res.status(500).json({ error: 'Failed to add group data' });
  }
});

// POST /api/umrah-visa/:bookingId/download-documents - Download documents and track
router.post('/:bookingId/download-documents', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can download documents
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can download documents' });
    }

    // Get booking with all passenger documents
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        tripInfo: true,
        passengers: {
          include: {
            documents: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.tripInfo) {
      return res.status(404).json({ error: 'Trip info not found' });
    }

    if (booking.tripInfo.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Documents can only be downloaded when status is pending',
        currentStatus: booking.tripInfo.status 
      });
    }

    // Check if documents have already been downloaded
    if (booking.tripInfo.documentsDownloadCount > 0) {
      return res.status(400).json({ 
        error: 'Documents have already been downloaded. Please request admin permission for re-download.',
        downloadCount: booking.tripInfo.documentsDownloadCount,
        lastDownloadedAt: booking.tripInfo.documentsDownloadedAt,
        lastDownloadedBy: booking.tripInfo.documentsDownloadedBy,
      });
    }

    // Collect all documents
    const allDocuments = booking.passengers.flatMap(p => p.documents);

    // For testing: Skip document check
    // if (allDocuments.length === 0) {
    //   return res.status(400).json({ error: 'No documents found for this booking' });
    // }

    // Update trip info - mark as downloaded
    const updatedTripInfo = await prisma.$transaction([
      prisma.tripInfo.update({
        where: { bookingId },
        data: {
          documentsDownloadCount: { increment: 1 },
          documentsDownloadedAt: new Date(),
          documentsDownloadedBy: user.id,
          updatedBy: user.id,
        },
      }),
    ]);

    // Sync status separately (handles both booking and tripInfo status + history)
    await syncBookingAndTripInfoStatus(bookingId, 'documents_downloaded', user.id, 'Documents downloaded');
    
    // Re-fetch updated tripInfo
    const finalTripInfo = await prisma.tripInfo.findUnique({ where: { bookingId } });

    res.json({
      message: 'Documents download tracked successfully',
      data: {
        documents: allDocuments,
        tripInfo: finalTripInfo,
      },
    });
  } catch (error) {
    console.error('Error tracking document download:', error);
    res.status(500).json({ error: 'Failed to track document download' });
  }
});

// POST /api/umrah-visa/:bookingId/upload-confirmation - Upload confirmation image
router.post('/:bookingId/upload-confirmation', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can upload confirmation
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can upload confirmation' });
    }

    const { confirmationImagePath } = req.body;

    if (!confirmationImagePath) {
      return res.status(400).json({ error: 'Confirmation image path is required' });
    }

    // Check if booking exists
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: { tripInfo: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.tripInfo) {
      return res.status(404).json({ error: 'Trip info not found' });
    }

    if (booking.tripInfo.status !== 'group_assigned') {
      return res.status(400).json({ 
        error: 'Confirmation can only be uploaded when status is group_assigned',
        currentStatus: booking.tripInfo.status 
      });
    }

    // Determine next status based on hasTransportation
    let nextStatus: 'voucher' | 'bill';
    if (booking.hasTransportation) {
      nextStatus = 'voucher';
    } else {
      nextStatus = 'bill';
    }

    // Update trip info with confirmation image
    const [updatedTripInfo] = await prisma.$transaction([
      prisma.tripInfo.update({
        where: { bookingId },
        data: {
          confirmationImagePath,
          confirmationUploadedAt: new Date(),
          updatedBy: user.id,
        },
      }),
    ]);

    // Sync status separately (handles both booking and tripInfo status + history)
    await syncBookingAndTripInfoStatus(bookingId, nextStatus, user.id, 'Confirmation image uploaded');
    
    // Re-fetch updated tripInfo
    const finalTripInfo = await prisma.tripInfo.findUnique({ where: { bookingId } });

    res.json({
      message: 'Confirmation uploaded successfully',
      data: {
        tripInfo: finalTripInfo,
      },
    });
  } catch (error) {
    console.error('Error uploading confirmation:', error);
    res.status(500).json({ error: 'Failed to upload confirmation' });
  }
});

// GET /api/umrah-visa/:bookingId/voucher-data - Get all data needed for voucher preview
router.get('/:bookingId/voucher-data', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can access voucher data
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can access voucher data' });
    }

    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        service: {
          include: {
            party: {
              select: {
                partyName: true,
                contactNumber: true,
                whatsappNumber: true,
              },
            },
          },
        },
        umrahVisaProvider: {
          select: {
            id: true,
            partyName: true,
            address: true,
            contactNumber: true,
            whatsappNumber: true,
            email: true,
          },
        },
        tripInfo: true,
        voucher: {
          select: {
            voucherNumber: true,
          },
        },
        travelDetails: {
          include: {
            arrivalAirport: true,
            departureAirport: true,
          },
        },
        accommodationDetails: {
          include: {
            hotelBookings: {
              include: {
                hotel: true,
                location: true,
              },
              orderBy: {
                checkInDate: 'asc',
              },
            },
          },
        },
        transportBookings: {
          include: {
            fromLocation: true,
            toLocation: true,
            fromSpecificLocation: true,
            toSpecificLocation: true,
          },
          orderBy: {
            travelDate: 'asc',
          },
        },
        passengers: {
          where: {
            isDeleted: false,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Auto-create TripInfo if missing (for group visas that might not have completed Step 4)
    let tripInfo = booking.tripInfo;
    if (!tripInfo) {
      try {
        tripInfo = await ensureTripInfoExists(bookingId, user.id);
        // Re-fetch booking to get updated tripInfo
        const updatedBooking = await prisma.umrahVisaBooking.findUnique({
          where: { id: bookingId },
          include: { tripInfo: true },
        });
        tripInfo = updatedBooking?.tripInfo || tripInfo;
      } catch (error: any) {
        console.error('Error creating TripInfo:', error);
        return res.status(400).json({ 
          error: 'Cannot create trip info. Missing required data: ' + error.message 
        });
      }
    }

    // Get the total count of all transport bookings EXCEPT the current booking's
    // This ensures route numbers continue sequentially across all bookings
    const totalTransportBookings = await prisma.umrahTransportBooking.count({
      where: {
        bookingId: { not: bookingId },
      },
    });
    const baseRouteNumber = totalTransportBookings;

    // Format data for voucher preview
    const voucherData = {
      bookingId: booking.id,
      reservationDate: booking.createdAt,
      reservationNumber: booking.voucher?.voucherNumber || '', // Use voucher number as reservation number (empty if voucher not generated yet)
      guestName: booking.service.party.partyName,
      guestMobile: booking.service.party.contactNumber || booking.service.party.whatsappNumber || '',
      groupCode: booking.groupNumber || tripInfo.groupNumber || '',
      groupName: booking.groupName || tripInfo.groupName || '',
      paxCount: booking.passengerCount,
      // Umrah Visa Provider details (for header section)
      umrahVisaProvider: booking.umrahVisaProvider ? {
        partyName: booking.umrahVisaProvider.partyName,
        address: booking.umrahVisaProvider.address || '',
        contactNumber: booking.umrahVisaProvider.contactNumber || '',
        whatsappNumber: booking.umrahVisaProvider.whatsappNumber || '',
        email: booking.umrahVisaProvider.email || '',
      } : null,
      hotelSchedules: booking.accommodationDetails?.hotelBookings.map((hb: any, idx: number) => ({
        number: idx + 1,
        location: hb.location.name,
        hotelName: hb.hotel.name,
        checkIn: hb.checkInDate,
        checkOut: hb.checkOutDate,
        days: Math.ceil((new Date(hb.checkOutDate).getTime() - new Date(hb.checkInDate).getTime()) / (1000 * 60 * 60 * 24)),
        brn: hb.brn && Array.isArray(hb.brn) ? hb.brn : null, // Include BRN if available
      })) || [],
      movementDetails: booking.transportBookings.map((tb: any, idx: number) => {
        // Generate route numbers starting from (totalTransportBookings + 1), incrementing for each transport
        // Format as 5-digit zero-padded number (00001, 00002, etc.)
        // This ensures route numbers continue sequentially across all bookings
        const routeNumber = (baseRouteNumber + idx + 1).toString().padStart(5, '0');
        
        return {
        sr: idx + 1,
          route: routeNumber, // Sequential route number continuing from previous bookings
          date: tb.travelDate ? formatDate(tb.travelDate) : '', // DD-MM-YYYY format
          time: tb.travelTime ? formatTime(tb.travelTime) : '', // HH:MM format
          from: tb.fromLocation?.name || '', // City name from LocationMaster
          fromLocation: tb.fromSpecificLocation?.name || '', // Specific location name (Airport, Hotel, Ziyarat)
        fromLocationId: tb.fromLocationId,
          fromSpecificLocationId: tb.fromSpecificLocationId,
          to: tb.toLocation?.name || '', // City name from LocationMaster
          toLocation: tb.toSpecificLocation?.name || '', // Specific location name (Airport, Hotel, Ziyarat)
        toLocationId: tb.toLocationId,
          toSpecificLocationId: tb.toSpecificLocationId,
          vehicleType: tb.vehicleType || '',
          paxCount: tb.paxCount || 0,
          price: tb.price ? Number(tb.price) : 0,
        };
      }),
      flightDetails: booking.travelDetails ? [
        {
          type: 'AA', // Arrival
          date: booking.travelDetails.arrivalDate ? formatDate(booking.travelDetails.arrivalDate) : '',
          carrier: booking.travelDetails.arrivalFlightNumber?.split('-')[0] || '',
          number: booking.travelDetails.arrivalFlightNumber?.split('-')[1] || '',
          from: booking.travelDetails.arrivalAirport.code,
          to: 'JED',
          etd: '',
          eta: booking.travelDetails.arrivalTime ? formatTime(booking.travelDetails.arrivalTime) : '',
        },
        {
          type: 'AD', // Departure
          date: booking.travelDetails.departureDate ? formatDate(booking.travelDetails.departureDate) : '',
          carrier: booking.travelDetails.departureFlightNumber?.split('-')[0] || '',
          number: booking.travelDetails.departureFlightNumber?.split('-')[1] || '',
          from: 'JED',
          to: booking.travelDetails.departureAirport.code,
          etd: booking.travelDetails.departureTime ? formatTime(booking.travelDetails.departureTime) : '',
          eta: '',
        },
      ] : [],
    };

    res.json(voucherData);
  } catch (error) {
    console.error('Error fetching voucher data:', error);
    res.status(500).json({ error: 'Failed to fetch voucher data' });
  }
});

// POST /api/umrah-visa/:bookingId/generate-voucher - Generate transport voucher
router.post('/:bookingId/generate-voucher', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;
    const voucherData = req.body; // Voucher data from preview form

    // Only admin/staff can generate voucher
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can generate voucher' });
    }

    // Check if booking exists
    let booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        tripInfo: true,
        umrahVisaProvider: {
          select: {
            id: true,
          },
        },
        service: {
          include: {
            party: {
              select: {
                partyName: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Ensure TripInfo exists (auto-create if missing)
    let tripInfo = booking.tripInfo;
    if (!tripInfo) {
      try {
        tripInfo = await ensureTripInfoExists(bookingId, user.id);
        // Re-fetch to get updated booking
        const updatedBooking = await prisma.umrahVisaBooking.findUnique({
          where: { id: bookingId },
          include: { 
            tripInfo: true,
            umrahVisaProvider: {
              select: {
                id: true,
              },
            },
            service: {
              include: {
                party: {
                  select: {
                    partyName: true,
                  },
                },
              },
            },
          },
        });
        if (updatedBooking) {
          booking = updatedBooking;
          tripInfo = updatedBooking.tripInfo || tripInfo;
        }
      } catch (error: any) {
        return res.status(400).json({ 
          error: 'Cannot create trip info. Missing required data: ' + error.message 
        });
      }
    }

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found after creating TripInfo' });
    }

    // Check status - use booking.status as source of truth, but also check tripInfo.status
    const currentStatus = booking.status === 'voucher' ? 'voucher' : tripInfo.status;
    if (currentStatus !== 'voucher') {
      return res.status(400).json({ 
        error: 'Voucher can only be generated when status is voucher',
        currentStatus,
        bookingStatus: booking.status,
        tripInfoStatus: tripInfo.status,
      });
    }

    // Generate voucher number
    const voucherNumber = await generateVoucherNumber();

    // Generate route numbers for movements
    const baseRouteNumber = 16469; // Starting route number
    const routeNumbers = generateRouteNumbers(baseRouteNumber, voucherData.movementDetails?.length || 0);

    // Add route numbers to movement details
    const movementDetailsWithRoutes = (voucherData.movementDetails || []).map((movement: any, idx: number) => ({
      ...movement,
      route: routeNumbers[idx] || movement.route,
    }));

    // Create voucher record
    const voucher = await prisma.$transaction(async (tx) => {
      // Create voucher
      const newVoucher = await tx.voucher.create({
        data: {
          bookingId,
          voucherNumber,
          reservationDate: new Date(voucherData.reservationDate || booking!.createdAt),
          guestName: voucherData.guestName || booking!.service?.party?.partyName || '',
          guestMobile: voucherData.guestMobile || '',
          groupCode: voucherData.groupCode || booking!.groupNumber || (booking!.tripInfo?.groupNumber || ''),
          umrahVisaProviderId: booking!.umrahVisaProviderId || null,
          paxCount: voucherData.paxCount || booking!.passengerCount,
          hotelSchedules: voucherData.hotelSchedules || [],
          movementDetails: movementDetailsWithRoutes,
          flightDetails: voucherData.flightDetails || [],
          generatedBy: user.id,
        },
      });

      // Update booking with voucher metadata
      await tx.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          voucherGeneratedAt: new Date(),
          voucherGeneratedBy: user.id,
        },
      });

      // Sync status using helper (updates both booking and tripInfo status in sync)
      await syncBookingAndTripInfoStatusInTx(bookingId, 'bill', user.id, 'Voucher generated', tx);

      return newVoucher;
    });

    res.json({
      message: 'Voucher generated successfully',
      data: {
        voucher,
      },
    });
  } catch (error) {
    console.error('Error generating voucher:', error);
    res.status(500).json({ error: 'Failed to generate voucher' });
  }
});

// GET /api/umrah-visa/:bookingId/available-actions - Get available actions based on status
router.get('/:bookingId/available-actions', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Get booking with trip info
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: { tripInfo: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.tripInfo) {
      return res.status(404).json({ error: 'Trip info not found' });
    }

    const status = booking.tripInfo.status;
    const isAdminOrStaff = user.role === 'admin' || user.role === 'staff';

    let availableActions: any[] = [];

    switch (status) {
      case 'pending':
        if (isAdminOrStaff) {
          availableActions.push({
            action: 'download_documents',
            label: 'Download Documents',
            description: 'Download passenger documents',
            endpoint: `/api/umrah-visa/${bookingId}/download-documents`,
            method: 'POST',
            warning: booking.tripInfo.documentsDownloadCount > 0 
              ? 'Documents already downloaded. Contact admin for re-download.' 
              : null,
          });
        }
        break;

      case 'documents_downloaded':
        if (isAdminOrStaff) {
          availableActions.push({
            action: 'add_group_data',
            label: 'Assign Group',
            description: 'Assign group number and name to this booking',
            endpoint: `/api/umrah-visa/${bookingId}/add-group-data`,
            method: 'POST',
          });
        }
        break;

      case 'group_assigned':
        if (isAdminOrStaff) {
          availableActions.push({
            action: 'upload_confirmation',
            label: 'Upload Image',
            description: 'Upload confirmation image',
            endpoint: `/api/umrah-visa/${bookingId}/upload-confirmation`,
            method: 'POST',
          });
        }
        break;

      case 'voucher':
        if (isAdminOrStaff) {
          availableActions.push({
            action: 'generate_voucher',
            label: 'Generate Voucher',
            description: 'Generate transport voucher',
            endpoint: `/api/umrah-visa/${bookingId}/generate-voucher`,
            method: 'POST',
          });
        }
        break;

      case 'bill':
        if (isAdminOrStaff) {
          availableActions.push({
            action: 'generate_bill',
            label: 'Generate Bill',
            description: 'Generate bill for this booking (functionality coming soon)',
            endpoint: `/api/umrah-visa/${bookingId}/generate-bill`,
            method: 'POST',
            disabled: true,
          });
        }
        break;

      case 'booking_success':
        // Final success status - no more actions needed
        break;

      case 'cancelled':
        // No actions available for cancelled bookings
        break;
    }

    res.json({
      bookingId,
      currentStatus: status,
      availableActions,
      tripInfo: booking.tripInfo,
    });
  } catch (error) {
    console.error('Error fetching available actions:', error);
    res.status(500).json({ error: 'Failed to fetch available actions' });
  }
});

// GET /api/umrah-visa/:bookingId/trip-info - Get trip info details
router.get('/:bookingId/trip-info', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const tripInfo = await prisma.tripInfo.findUnique({
      where: { bookingId },
      include: {
        booking: {
          include: {
            service: {
              include: {
                party: true,
              },
            },
          },
        },
        updatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        documentsDownloadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!tripInfo) {
      return res.status(404).json({ error: 'Trip info not found' });
    }

    res.json(tripInfo);
  } catch (error) {
    console.error('Error fetching trip info:', error);
    res.status(500).json({ error: 'Failed to fetch trip info' });
  }
});

// ==================== GROUP BOOKING ENDPOINTS ====================

// POST /api/umrah-visa/group/step1 - Group Step 1: Validation Only (No DB writes)
router.post('/group/step1', authenticate, async (req, res) => {
  try {
    const { partyId } = req.body;
    const validatedData = groupStep1Schema.parse(req.body);

    if (!partyId) {
      return res.status(400).json({ error: 'Party ID is required' });
    }

    // Only validate - no database writes
    // Data will be saved only when all steps are completed in create-group-booking endpoint
    res.status(200).json({
      message: 'Group booking step 1 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in group booking step 1 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 1' });
  }
});

// POST /api/umrah-visa/group/step2 - Group Step 2: Validation Only (No DB writes)
router.post('/group/step2', authenticate, async (req, res) => {
  try {
    const validatedData = step2Schema.parse(req.body);

    // Validate date range (80 days max)
    if (!validateDateRange(validatedData.arrivalDate, validatedData.departureDate)) {
      return res.status(400).json({ error: 'Travel duration cannot exceed 80 days' });
    }

    // Only validate - no database writes
    // Data will be saved only when all steps are completed in create-group-booking endpoint
    res.status(200).json({
      message: 'Group booking step 2 validation successful',
      valid: true,
      });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in group booking step 2 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 2' });
  }
    });

// Group booking step 3 schema - only transport segments and ziyaraths (hotels validated in step2)
const groupStep3Schema = z.object({
  transportSegments: z.array(z.object({
    fromLocationId: z.string().uuid(),
    toLocationId: z.string().uuid(),
    fromHotelId: z.string().uuid().optional(), // LocationMaster ID for specific "from" location
    toHotelId: z.string().uuid().optional(),   // LocationMaster ID for specific "to" location
    vehicleType: z.string().optional(), // Made optional since it's not displayed in UI
    paxCount: z.number().min(0), // Changed to allow 0 (will be updated later)
    price: z.number().min(0),
    travelDate: z.string().transform((str) => new Date(str)).optional(),
    travelTime: z.string().transform((str) => {
      const today = new Date();
      const [hours, minutes] = str.split(':');
      today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return today;
    }).optional(),
  })).optional(),
  ziyaraths: z.array(z.object({
    id: z.string(),
    ziyarathId: z.string().uuid(), // LocationMaster ID of ziyarath
    date: z.string().transform((str) => new Date(str)),
    time: z.string(),
  })).optional(),
});

// POST /api/umrah-visa/group/step3 - Group Step 3: Validation Only (No DB writes)
router.post('/group/step3', authenticate, async (req, res) => {
  try {
    const validatedData = groupStep3Schema.parse(req.body);

    // Only validate - no database writes
    // Data will be saved only when all steps are completed in create-group-booking endpoint
    res.status(200).json({
      message: 'Group booking step 3 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in group booking step 3 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 3' });
  }
});

// Complete group booking schema
const completeGroupBookingSchema = z.object({
  partyId: z.string().uuid(),
  step1: groupStep1Schema,
  step2: step2Schema,
  step3: groupStep3Schema,
  step4: z.object({
    passengerCount: z.number().min(1).max(50).optional(), // Made optional since it's now in step1
    passengers: z.array(z.object({
      fullName: z.string().min(1).max(255).optional(), // Made optional - not required for group bookings with ZIP
      isLeadPassenger: z.boolean().default(false),
      panCardPhoto: z.any().optional(),
    })).optional(), // Made optional - only ZIP file is required
  }),
});

// POST /api/umrah-visa/group/create-booking - Create complete group booking (all steps in one transaction)
router.post('/group/create-booking', authenticate, upload.single('panCardZipFile'), async (req, res) => {
  try {
    const user = (req as any).user;
    
    // Parse JSON strings from FormData
    let step1Data, step2Data, step3Data, step4Data, partyId;
    
    if (req.body.step1) {
      // FormData mode - parse JSON strings
      partyId = req.body.partyId;
      step1Data = JSON.parse(req.body.step1);
      step2Data = JSON.parse(req.body.step2);
      step3Data = JSON.parse(req.body.step3);
      step4Data = JSON.parse(req.body.step4);
      
      // Convert date strings to Date objects for step2Data
      if (step2Data.arrivalDate) {
        step2Data.arrivalDate = new Date(step2Data.arrivalDate);
      }
      if (step2Data.departureDate) {
        step2Data.departureDate = new Date(step2Data.departureDate);
      }
      // Convert time strings (HH:mm) to Date objects
      if (step2Data.arrivalTime) {
        if (typeof step2Data.arrivalTime === 'string' && step2Data.arrivalTime.includes(':')) {
          // Time is in HH:mm format, combine with today's date
          const today = new Date();
          const [hours, minutes] = step2Data.arrivalTime.split(':');
          today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          step2Data.arrivalTime = today;
        } else {
          step2Data.arrivalTime = new Date(step2Data.arrivalTime);
        }
      }
      if (step2Data.departureTime) {
        if (typeof step2Data.departureTime === 'string' && step2Data.departureTime.includes(':')) {
          // Time is in HH:mm format, combine with today's date
          const today = new Date();
          const [hours, minutes] = step2Data.departureTime.split(':');
          today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          step2Data.departureTime = today;
        } else {
          step2Data.departureTime = new Date(step2Data.departureTime);
        }
      }
      
      // Convert date strings to Date objects for step3Data hotel bookings
      if (step3Data.hotelBookings && Array.isArray(step3Data.hotelBookings)) {
        step3Data.hotelBookings = step3Data.hotelBookings.map((hotel: any) => ({
          ...hotel,
          checkInDate: hotel.checkInDate ? new Date(hotel.checkInDate) : hotel.checkInDate,
          checkOutDate: hotel.checkOutDate ? new Date(hotel.checkOutDate) : hotel.checkOutDate,
        }));
      }
      
      // Convert date strings to Date objects for step2Data hotel bookings
      if (step2Data.hotelBookings && Array.isArray(step2Data.hotelBookings)) {
        step2Data.hotelBookings = step2Data.hotelBookings.map((hotel: any) => ({
          ...hotel,
          checkInDate: hotel.checkInDate ? new Date(hotel.checkInDate) : hotel.checkInDate,
          checkOutDate: hotel.checkOutDate ? new Date(hotel.checkOutDate) : hotel.checkOutDate,
        }));
      }
      
      // Convert date strings to Date objects for step3Data transport segments
      if (step3Data.transportSegments && Array.isArray(step3Data.transportSegments)) {
        step3Data.transportSegments = step3Data.transportSegments.map((segment: any) => {
          const converted: any = { ...segment };
          if (segment.travelDate) {
            converted.travelDate = new Date(segment.travelDate);
          }
          if (segment.travelTime) {
            if (typeof segment.travelTime === 'string' && segment.travelTime.includes(':')) {
              // Time is in HH:mm format, combine with today's date
              const today = new Date();
              const [hours, minutes] = segment.travelTime.split(':');
              today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
              converted.travelTime = today;
            } else {
              converted.travelTime = new Date(segment.travelTime);
            }
          }
          return converted;
        });
      }
      
      // Convert date strings to Date objects for step3Data ziyaraths
      if (step3Data.ziyaraths && Array.isArray(step3Data.ziyaraths)) {
        step3Data.ziyaraths = step3Data.ziyaraths.map((ziyarath: any) => ({
          ...ziyarath,
          date: ziyarath.date ? new Date(ziyarath.date) : ziyarath.date,
        }));
      }
    } else {
      // JSON mode (backward compatibility)
      const validatedData = completeGroupBookingSchema.parse(req.body);
      partyId = validatedData.partyId;
      step1Data = validatedData.step1;
      step2Data = validatedData.step2;
      step3Data = validatedData.step3;
      step4Data = validatedData.step4;
    }

    // Validate required fields
    if (!partyId) {
      return res.status(400).json({ error: 'Party ID is required' });
    }

    // Validate date range
    if (!validateDateRange(step2Data.arrivalDate, step2Data.departureDate)) {
      return res.status(400).json({ error: 'Travel duration cannot exceed 80 days' });
    }

    // Validate passenger count (use from step1Data if available, otherwise from step4Data)
    const passengerCount = step1Data.passengerCount || step4Data.passengerCount;
    if (!passengerCount || passengerCount < 1 || passengerCount > 50) {
      return res.status(400).json({ error: 'Passenger count must be between 1 and 50' });
    }

    // Validate ZIP file upload for group bookings (ONLY requirement)
    const zipFile = req.file; // Multer provides the uploaded file
    if (!zipFile) {
      return res.status(400).json({ 
        error: 'PAN card ZIP file is required. Please upload a ZIP file containing all PAN cards for the group.' 
      });
    }

    // Validate ZIP file type
    const isValidZip = zipFile.mimetype === 'application/zip' || 
                       zipFile.mimetype === 'application/x-zip-compressed' ||
                       zipFile.originalname.toLowerCase().endsWith('.zip');
    if (!isValidZip) {
      return res.status(400).json({ error: 'Invalid file type. Please upload a ZIP file (.zip)' });
    }

    // Create passengers array from passengerCount (no individual names required)
    const passengers = Array(passengerCount).fill(null).map((_, index) => ({
      fullName: step1Data.groupName || `Passenger ${index + 1}`, // Use group name or default
      isLeadPassenger: index === 0,
    }));

    // Calculate hasTransportation
    const hasTransportation = (step3Data.transportSegments && step3Data.transportSegments.length > 0) ||
                              (step2Data.transportBookings && step2Data.transportBookings.length > 0);

    // Save everything in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Service
      const service = await tx.service.create({
      data: {
          serviceType: 'umrah_visa',
          partyId: partyId,
          status: 'completed',
        },
      });

      // 2. Create UmrahVisaBooking (group visa, always hotel, status = voucher)
      const booking = await tx.umrahVisaBooking.create({
        data: {
          serviceId: service.id,
          groupNumber: step1Data.groupNumber,
          groupName: step1Data.groupName,
          hasGroupNumber: true,
          passengerCount: step1Data.passengerCount,
          umrahVisaProviderId: step1Data.umrahVisaProviderId || null,
          status: 'voucher',
          visaType: 'group_visa',
        accommodationType: 'hotel',
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

      // 4. Create UmrahAccommodationDetails (always hotel for group)
      const accommodationDetails = await tx.umrahAccommodationDetails.create({
        data: {
          bookingId: booking.id,
          accommodationType: 'hotel',
        },
      });

      // 5. Create UmrahHotelBooking (from step2Data for group bookings)
      const hotelBookingsData = step2Data.hotelBookings || [];
      if (hotelBookingsData.length > 0) {
        // First, resolve locationId: frontend sends CityMaster ID, but we need LocationMaster ID
        // Find LocationMaster entries for hotels to get their cityIds
        const hotelIds = hotelBookingsData.map((h: any) => h.hotelId);
        const hotelLocationMasters = await tx.locationMaster.findMany({
          where: { id: { in: hotelIds } },
          select: { id: true, cityId: true },
        });

        // Create map: hotelId -> cityId
        const hotelCityMap = new Map<string, string>();
        hotelLocationMasters.forEach((lm) => {
          hotelCityMap.set(lm.id, lm.cityId);
        });

        // For each hotel booking, find LocationMaster entry for the city
        // If frontend sent CityMaster ID as locationId, we need to find LocationMaster with matching cityId
        // OR use the hotel's cityId to find/create a LocationMaster entry
        await Promise.all(
          hotelBookingsData.map(async (hotel: any) => {
            // Get cityId from hotel's LocationMaster entry
            const cityId = hotelCityMap.get(hotel.hotelId);
            
            // Find LocationMaster entry for this city (could be DESTINATION, OTHERS, or any type)
            // If not found, we'll use the hotel's cityId to find one, or create logic to handle it
            let locationMasterId: string;
            
            if (cityId) {
              // Try to find a LocationMaster entry for this city
              // Usually there should be one, but if not, we might need to handle it differently
              const cityLocationMaster = await tx.locationMaster.findFirst({
                where: { 
                  cityId: cityId,
                  // Prefer OTHERS type for city location, or any LocationMaster in that city
                  locationType: 'OTHERS',
                },
                select: { id: true },
              });
              
              if (cityLocationMaster) {
                locationMasterId = cityLocationMaster.id;
              } else {
                // If no LocationMaster found for city, use hotel's cityId directly
                // But wait - we need a LocationMaster ID, not CityMaster ID
                // Let's check if the frontend locationId might already be a LocationMaster ID
                // OR we need to use the hotel's city as the location
                // For now, let's check if hotel.locationId is actually a LocationMaster ID
                const testLocationMaster = await tx.locationMaster.findUnique({
                  where: { id: hotel.locationId },
                });
                
                if (testLocationMaster) {
                  // Frontend sent LocationMaster ID after all
                  locationMasterId = hotel.locationId;
                } else {
                  // Use hotel's cityId to find or we need to create/find a LocationMaster
                  // For now, let's use the hotel's city and find any LocationMaster in that city
                  const anyLocationInCity = await tx.locationMaster.findFirst({
                    where: { cityId: cityId },
                    select: { id: true },
                  });
                  
                  if (anyLocationInCity) {
                    locationMasterId = anyLocationInCity.id;
                  } else {
                    throw new Error(`No LocationMaster found for city ${cityId}. Hotel booking requires a LocationMaster entry for the city.`);
                  }
                }
              }
            } else {
              // Fallback: try using hotel.locationId as-is (might be LocationMaster ID)
              const testLocationMaster = await tx.locationMaster.findUnique({
                where: { id: hotel.locationId },
              });
              
              if (testLocationMaster) {
                locationMasterId = hotel.locationId;
              } else {
                throw new Error(`Invalid locationId ${hotel.locationId} for hotel booking`);
              }
            }

            return tx.umrahHotelBooking.create({
              data: {
                accommodationId: accommodationDetails.id,
                locationId: locationMasterId,
                hotelId: hotel.hotelId,
                checkInDate: hotel.checkInDate,
                checkOutDate: hotel.checkOutDate,
                brn: hotel.brn && Array.isArray(hotel.brn) && hotel.brn.length > 0 
                  ? hotel.brn 
                  : null,
              },
            });
          })
        );
      }

      // 6. Create UmrahTransportBooking (from step3 transportSegments or step2 transportBookings)
      const transportBookings = [
        ...(step3Data.transportSegments || []),
        ...(step2Data.transportBookings || []),
      ];

      // Convert ziyaraths to transport segments
      if (step3Data.ziyaraths && step3Data.ziyaraths.length > 0) {
        // Get all hotel bookings from step2Data (hotels are validated in step2)
        const hotelBookingsData = step2Data.hotelBookings || [];
        
        // Fetch all location masters for ziyaraths and hotels
        const ziyarathLocationIds = step3Data.ziyaraths.map((z: any) => z.ziyarathId);
        const hotelLocationIds = hotelBookingsData.map((h: any) => h.hotelId);
        const allLocationIds = [...ziyarathLocationIds, ...hotelLocationIds];
        
        const locationMasters = await tx.locationMaster.findMany({
          where: { id: { in: allLocationIds } },
          include: { cityMaster: true },
        });

        // Create a map of ziyarath location -> city
        const ziyarathCityMap = new Map<string, string>();
        step3Data.ziyaraths.forEach((ziyarath: any) => {
          const ziyarathLoc = locationMasters.find(lm => lm.id === ziyarath.ziyarathId);
          if (ziyarathLoc) {
            const cityName = (ziyarathLoc.city || ziyarathLoc.cityMaster?.name || '').toLowerCase().trim();
            ziyarathCityMap.set(ziyarath.ziyarathId, cityName);
          }
        });

        // Find hotel for each ziyarath (hotel in same city)
        // Use for...of loop to handle async operations
        for (const ziyarath of step3Data.ziyaraths as any[]) {
          const ziyarathCity = ziyarathCityMap.get(ziyarath.ziyarathId);
          if (!ziyarathCity) continue;

          // Find hotel booking in the same city
          const hotelBooking = hotelBookingsData.find((hb: any) => {
            const hotelLoc = locationMasters.find(lm => lm.id === hb.hotelId);
            if (!hotelLoc) return false;
            const hotelCity = (hotelLoc.city || hotelLoc.cityMaster?.name || '').toLowerCase().trim();
            return hotelCity === ziyarathCity;
          });

          if (!hotelBooking) continue;

          // Get city location ID (from hotel's city)
          const hotelLoc = locationMasters.find(lm => lm.id === hotelBooking.hotelId);
          if (!hotelLoc || !hotelLoc.cityId) continue;

          // Find the LocationMaster that represents the city itself
          // Cities are typically stored as LocationMaster entries with the same cityId
          // Try to find any LocationMaster with the same cityId (could be OTHERS type or any type)
          const cityLocationMaster = await tx.locationMaster.findFirst({
            where: {
              cityId: hotelLoc.cityId,
              isActive: true,
            },
            orderBy: {
              locationType: 'asc', // Prefer specific types first
            },
          });

          if (!cityLocationMaster) {
            console.warn(`[create-group-booking] City LocationMaster not found for cityId: ${hotelLoc.cityId}`);
            continue;
          }

          // Convert ziyarath to transport segment
          transportBookings.push({
            fromLocationId: cityLocationMaster.id, // City LocationMaster ID
            toLocationId: cityLocationMaster.id,   // Same city (ziyarath is within city)
            fromHotelId: hotelBooking.hotelId, // Hotel LocationMaster ID
            toHotelId: ziyarath.ziyarathId,    // Ziyarath LocationMaster ID
            vehicleType: '',                   // Ziyarath doesn't require vehicle type
            paxCount: 0,                       // Will be set based on passenger count
            price: 0,                          // Ziyarath is typically included
            travelDate: ziyarath.date,
            travelTime: ziyarath.time ? (() => {
              const today = new Date();
              const [hours, minutes] = ziyarath.time.split(':');
              today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
              return today;
            })() : null,
          } as any);
        }
      }

      if (transportBookings.length > 0) {
        // First, collect all location IDs that need to be resolved
        const allLocationIds = new Set<string>();
        transportBookings.forEach((transport: any) => {
          if (transport.fromLocationId) allLocationIds.add(transport.fromLocationId);
          if (transport.toLocationId) allLocationIds.add(transport.toLocationId);
        });

        // Check which ones are LocationMaster IDs and which might be CityMaster IDs
        const locationIdsArray = Array.from(allLocationIds);
        const existingLocationMasters = await tx.locationMaster.findMany({
          where: { id: { in: locationIdsArray } },
          select: { id: true },
        });

        const existingLocationMasterIds = new Set(existingLocationMasters.map(lm => lm.id));
        const potentialCityMasterIds = locationIdsArray.filter(id => !existingLocationMasterIds.has(id));

        // For potential CityMaster IDs, find corresponding LocationMaster entries
        const cityToLocationMasterMap = new Map<string, string>();
        if (potentialCityMasterIds.length > 0) {
          // Find LocationMaster entries that have these cityIds
          const cityLocationMasters = await tx.locationMaster.findMany({
            where: {
              cityId: { in: potentialCityMasterIds },
              isActive: true,
            },
            select: { id: true, cityId: true },
            orderBy: {
              locationType: 'asc', // Prefer OTHERS type
            },
          });

          // Group by cityId and take the first one for each city
          const cityIdToLocationMaster = new Map<string, string>();
          cityLocationMasters.forEach((lm) => {
            if (!cityIdToLocationMaster.has(lm.cityId)) {
              cityIdToLocationMaster.set(lm.cityId, lm.id);
            }
          });

          // For each potential CityMaster ID, map to LocationMaster ID
          potentialCityMasterIds.forEach((cityId) => {
            const locationMasterId = cityIdToLocationMaster.get(cityId);
            if (locationMasterId) {
              cityToLocationMasterMap.set(cityId, locationMasterId);
            }
          });
        }

        await Promise.all(
          transportBookings.map((transport: any) => {
            // Resolve fromLocationId
            let fromLocationId = transport.fromLocationId;
            if (fromLocationId && !existingLocationMasterIds.has(fromLocationId)) {
              const resolvedId = cityToLocationMasterMap.get(fromLocationId);
              if (resolvedId) {
                fromLocationId = resolvedId;
              } else {
                // If still not found, throw error
                throw new Error(`Invalid fromLocationId: ${transport.fromLocationId}. Not found in LocationMaster or CityMaster.`);
              }
            }

            // Resolve toLocationId
            let toLocationId = transport.toLocationId;
            if (toLocationId && !existingLocationMasterIds.has(toLocationId)) {
              const resolvedId = cityToLocationMasterMap.get(toLocationId);
              if (resolvedId) {
                toLocationId = resolvedId;
              } else {
                // If still not found, throw error
                throw new Error(`Invalid toLocationId: ${transport.toLocationId}. Not found in LocationMaster or CityMaster.`);
              }
            }

            // Ensure travelTime is a valid Date or null
            let travelTime: Date | null = null;
            if (transport.travelTime) {
              if (transport.travelTime instanceof Date) {
                // Check if Date is valid
                if (!isNaN(transport.travelTime.getTime())) {
                  travelTime = transport.travelTime;
                }
              } else if (typeof transport.travelTime === 'string') {
                // Try to parse as Date
                const parsedDate = new Date(transport.travelTime);
                if (!isNaN(parsedDate.getTime())) {
                  travelTime = parsedDate;
                }
              }
            }

            // Ensure travelDate is a valid Date or null
            let travelDate: Date | null = null;
            if (transport.travelDate) {
              if (transport.travelDate instanceof Date) {
                if (!isNaN(transport.travelDate.getTime())) {
                  travelDate = transport.travelDate;
                }
              } else if (typeof transport.travelDate === 'string') {
                const parsedDate = new Date(transport.travelDate);
                if (!isNaN(parsedDate.getTime())) {
                  travelDate = parsedDate;
                }
              }
            }

            return tx.umrahTransportBooking.create({
              data: {
                bookingId: booking.id,
                fromLocationId: fromLocationId,
                toLocationId: toLocationId,
                fromSpecificLocationId: transport.fromHotelId || null,
                toSpecificLocationId: transport.toHotelId || null,
                vehicleType: transport.vehicleType || '',
                paxCount: transport.paxCount || passengerCount || 1,
                price: transport.price || 0,
                travelDate: travelDate,
                travelTime: travelTime,
              },
            });
          })
        );
      }

      // 7. Create UmrahPassenger (all passengers) - using generated passengers from passengerCount
      const passengerRecords = await Promise.all(
        passengers.map((passenger: any) =>
          tx.umrahPassenger.create({
          data: {
              bookingId: booking.id,
            fullName: passenger.fullName.trim(),
            isLeadPassenger: passenger.isLeadPassenger,
          },
          })
        )
    );

      // 7.5. Save ZIP file as Document (linked to service, not individual passenger)
      if (zipFile) {
        await tx.document.create({
          data: {
            serviceId: service.id,
            documentType: 'pan_card_zip',
            fileName: zipFile.originalname,
            filePath: zipFile.path,
            fileSize: zipFile.size,
            mimeType: zipFile.mimetype,
          },
        });
      }

      // 8. Get party name
      const party = await tx.party.findUnique({
        where: { id: partyId },
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
          updatedBy: user.id,
          status: 'voucher',
      },
    });

      // 10. Create BookingStatusHistory
      await tx.bookingStatusHistory.create({
      data: {
          bookingId: booking.id,
          oldStatus: null,
          newStatus: 'voucher',
          changedBy: user.id,
          reason: 'Group booking created',
      },
    });

      return { booking, service, travelDetails, accommodationDetails, passengers, tripInfo };
    });

    res.status(201).json({
      message: 'Group Umrah visa booking completed successfully',
      data: {
        bookingId: result.booking.id,
        serviceId: result.service.id,
        passengerCount: passengerCount,
        passengers: result.passengers,
        tripInfo: result.tripInfo,
        status: 'voucher',
      },
    });
  } catch (error) {
    // Handle multer errors
    if ((error as any).code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 50MB limit. Please compress your files.' });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: error.message });
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return res.status(400).json({ error: 'Invalid JSON data in request' });
    }
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    
    console.error('❌ Error creating group booking:', error);
    res.status(500).json({ error: 'Failed to create group booking' });
  }
});


// POST /api/umrah-visa/seed-ziyarah-hotels - Seed Ziyarah hotels as LocationMaster entries
router.post('/seed-ziyarah-hotels', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Find Makkah and Madinah cities
    const makkahCity = await prisma.cityMaster.findFirst({
      where: {
        name: { in: ['Makkah', 'Mecca', 'Makkah Al Mukarramah'] },
        isActive: true,
      },
    });

    const madinahCity = await prisma.cityMaster.findFirst({
      where: {
        name: { in: ['Madinah', 'Medina', 'Al Madinah Al Munawwarah'] },
        isActive: true,
      },
    });

    if (!makkahCity) {
      return res.status(404).json({ error: 'Makkah city not found. Please create it in City Master first.' });
    }
    if (!madinahCity) {
      return res.status(404).json({ error: 'Madinah city not found. Please create it in City Master first.' });
    }

    // Get country for the cities
    const makkahCountry = await prisma.countryMaster.findUnique({
      where: { id: makkahCity.countryId },
    });

    const madinahCountry = await prisma.countryMaster.findUnique({
      where: { id: madinahCity.countryId },
    });

    if (!makkahCountry || !madinahCountry) {
      return res.status(404).json({ error: 'Country not found for cities' });
    }

    // Check if ziyarah hotels already exist
    const makZiyExists = await prisma.locationMaster.findFirst({
      where: {
        code: 'MAK_ZIY',
        locationType: 'HOTEL',
      },
    });

    const madZiyExists = await prisma.locationMaster.findFirst({
      where: {
        code: 'MAD_ZIY',
        locationType: 'HOTEL',
      },
    });

    const results: any[] = [];

    // Create Makkah Ziyarah if it doesn't exist
    if (!makZiyExists) {
      const makZiy = await prisma.locationMaster.create({
        data: {
          code: 'MAK_ZIY',
          name: 'Makkah Ziyarah',
          locationType: 'HOTEL',
          countryId: makkahCity.countryId,
          cityId: makkahCity.id,
          city: makkahCity.name,
          isActive: true,
        },
      });
      results.push({ action: 'created', hotel: makZiy });
    } else {
      results.push({ action: 'exists', hotel: makZiyExists });
    }

    // Create Madinah Ziyarah if it doesn't exist
    if (!madZiyExists) {
      const madZiy = await prisma.locationMaster.create({
        data: {
          code: 'MAD_ZIY',
          name: 'Madinah Ziyarah',
          locationType: 'HOTEL',
          countryId: madinahCity.countryId,
          cityId: madinahCity.id,
          city: madinahCity.name,
          isActive: true,
        },
      });
      results.push({ action: 'created', hotel: madZiy });
    } else {
      results.push({ action: 'exists', hotel: madZiyExists });
    }

    res.json({
      message: 'Ziyarah hotels seeded successfully',
      results,
    });
  } catch (error) {
    console.error('Error seeding ziyarah hotels:', error);
    res.status(500).json({ error: 'Failed to seed ziyarah hotels' });
  }
});

export default router;