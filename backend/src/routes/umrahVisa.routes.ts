import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { AuditService } from '../services/auditService';
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
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

// Helper function to check if airport requires transport selection
const requiresTransport = async (airportId: string) => {
  const airport = await prisma.airportMaster.findUnique({
    where: { id: airportId },
    select: { airportCode: true },
  });
  
  return airport && ['JED', 'MED'].includes(airport.airportCode);
};

// Helper function to find destination by city with spelling variations
const findDestinationByCity = async (city: string) => {
  const cityVariations = [city];
  if (city === 'Medina') cityVariations.push('Madinah');
  if (city === 'Madinah') cityVariations.push('Medina');
  if (city === 'Mecca') cityVariations.push('Makkah');
  if (city === 'Makkah') cityVariations.push('Mecca');
  
  return await prisma.destinationMaster.findFirst({
    where: {
      city: {
        in: cityVariations,
      },
      isActive: true,
    },
  });
};

// POST /api/umrah-visa/step1 - Step 1: Group Number and Group Name
router.post('/step1', authenticate, async (req, res) => {
  try {
    const { partyId } = req.body;
    const validatedData = step1Schema.parse(req.body);

    if (!partyId) {
      return res.status(400).json({ error: 'Party ID is required' });
    }

    // Create service first
    const service = await prisma.service.create({
      data: {
        serviceType: 'umrah_visa',
        partyId,
        status: 'pending',
      },
    });

    // Create basic booking
    const booking = await prisma.umrahVisaBooking.create({
      data: {
        serviceId: service.id,
        groupNumber: validatedData.groupNumber,
        groupName: validatedData.groupName,
        hasGroupNumber: !!(validatedData.groupNumber && validatedData.groupName), // Set to true if both are provided
        passengerCount: 1, // Default, will be updated in step 3
        visaType: 'individual_visa', // Set visa type to individual for regular bookings
      },
    });

    res.status(201).json({
      message: 'Step 1 completed successfully',
      bookingId: booking.id,
      serviceId: service.id,
      data: booking,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in step 1:', error);
    res.status(500).json({ error: 'Failed to complete step 1' });
  }
});

// POST /api/umrah-visa/step2/:bookingId - Step 2: Arrival & Departure Details
router.post('/step2/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    console.log('🚀 Step 2 request for booking:', bookingId);
    console.log('📋 Step 2 request body:', req.body);
    
    const validatedData = step2Schema.parse(req.body);
    console.log('✅ Step 2 validation passed:', validatedData);

    // Check if booking exists
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Validate date range (80 days max)
    if (!validateDateRange(validatedData.arrivalDate, validatedData.departureDate)) {
      return res.status(400).json({ error: 'Travel duration cannot exceed 80 days' });
    }

    // Check if arrival airport requires transport selection
    const needsTransport = await requiresTransport(validatedData.arrivalAirportId);
    
    if (needsTransport && (!validatedData.transportBookings || validatedData.transportBookings.length === 0)) {
      return res.status(400).json({ 
        error: 'Transport selection is required for Jeddah/Medina airports',
        requiresTransport: true 
      });
    }

    // Create travel details
    const travelDetails = await prisma.umrahTravelDetails.create({
      data: {
        bookingId,
        arrivalDate: validatedData.arrivalDate,
        arrivalTime: validatedData.arrivalTime,
        arrivalAirportId: validatedData.arrivalAirportId,
        arrivalFlightNumber: validatedData.arrivalFlightNumber,
        departureDate: validatedData.departureDate,
        departureTime: validatedData.departureTime,
        departureAirportId: validatedData.departureAirportId,
        departureFlightNumber: validatedData.departureFlightNumber,
      },
    });

    // Create transport bookings if provided
    let transportBookings: any[] = [];
    const hasTransportation = validatedData.transportBookings && validatedData.transportBookings.length > 0;
    
    if (hasTransportation && validatedData.transportBookings) {
      transportBookings = await Promise.all(
        validatedData.transportBookings.map(transport =>
          prisma.umrahTransportBooking.create({
            data: {
              bookingId,
              fromLocationId: transport.fromLocationId,
              toLocationId: transport.toLocationId,
              vehicleType: transport.vehicleType,
              paxCount: transport.paxCount,
              price: transport.price,
              travelDate: transport.travelDate,
            },
          })
        )
      );
    }

    // Update booking with hasTransportation flag
    await prisma.umrahVisaBooking.update({
      where: { id: bookingId },
      data: {
        hasTransportation,
      },
    });

    res.json({
      message: 'Step 2 completed successfully',
      data: {
        travelDetails,
        transportBookings,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Step 2 validation failed:', error.issues);
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('❌ Error in step 2:', error);
    res.status(500).json({ error: 'Failed to complete step 2' });
  }
});

// POST /api/umrah-visa/step3/:bookingId - Step 3: Accommodation Details
router.post('/step3/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const validatedData = step3Schema.parse(req.body);

    // Check if booking exists
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update the main booking with accommodation type
    await prisma.umrahVisaBooking.update({
      where: { id: bookingId },
      data: {
        accommodationType: validatedData.accommodationType,
      },
    });

    // Create or update accommodation details (passengerCount will be set in Step 4)
    const accommodationData: any = {
      accommodationType: validatedData.accommodationType,
    };

    // Add iqama details if accommodation type is iqama
    if (validatedData.accommodationType === 'iqama' && validatedData.iqamaDetails) {
      accommodationData.iqamaNumber = validatedData.iqamaDetails.iqamaNumber;
      accommodationData.iqamaName = validatedData.iqamaDetails.iqamaName;
      accommodationData.iqamaDob = validatedData.iqamaDetails.iqamaDob;
      accommodationData.iqamaMobile = validatedData.iqamaDetails.iqamaMobile;
    }

    const accommodationDetails = await prisma.umrahAccommodationDetails.upsert({
      where: { bookingId },
      update: accommodationData,
      create: {
        bookingId,
        ...accommodationData,
      },
    });

    // Create hotel bookings if accommodation type is hotel
    let hotelBookings: any[] = [];
    if (validatedData.accommodationType === 'hotel' && validatedData.hotelBookings) {
      hotelBookings = await Promise.all(
        validatedData.hotelBookings.map(hotel =>
          prisma.umrahHotelBooking.create({
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

    res.json({
      message: 'Step 3 completed successfully',
      data: {
        accommodationDetails,
        hotelBookings,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in step 3:', error);
    res.status(500).json({ error: 'Failed to complete step 3' });
  }
});

// POST /api/umrah-visa/step4/:bookingId - Step 4: Passenger Details
router.post('/step4/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const validatedData = step4Schema.parse(req.body);
    const user = (req as any).user;

    // Check if booking exists with all related data
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        service: {
          include: {
            party: true,
          },
        },
        travelDetails: true,
        accommodationDetails: true,
      },
    });

    // Validate document requirements based on booking mode and accommodation type
    const isGroupBooking = booking?.hasGroupNumber;
    const accommodationType = booking?.accommodationType;

    if (isGroupBooking && accommodationType) {
      for (const passenger of validatedData.passengers) {
        if (accommodationType === 'iqama') {
          // Group + Iqama: Iqama photo + PAN card required
          if (!passenger.documents?.iqamaPhoto) {
            return res.status(400).json({ 
              error: `Iqama photo is required for ${passenger.fullName || 'passenger'}` 
            });
          }
          if (!passenger.documents?.panCardPhoto) {
            return res.status(400).json({ 
              error: `PAN card is required for ${passenger.fullName || 'passenger'}` 
            });
          }
        } else if (accommodationType === 'hotel') {
          // Group + Hotel: PAN card + Hotel booking + Ticket copy required
          if (!passenger.documents?.panCardPhoto) {
            return res.status(400).json({ 
              error: `PAN card is required for ${passenger.fullName || 'passenger'}` 
            });
          }
          if (!passenger.documents?.hotelBooking) {
            return res.status(400).json({ 
              error: `Hotel booking document is required for ${passenger.fullName || 'passenger'}` 
            });
          }
          if (!passenger.documents?.ticketCopy) {
            return res.status(400).json({ 
              error: `Ticket copy is required for ${passenger.fullName || 'passenger'}` 
            });
          }
        }
      }
    } else {
      // Regular booking: Validate lead passenger documents
      const leadPassenger = validatedData.passengers.find(p => p.isLeadPassenger);
      if (leadPassenger) {
        if (!leadPassenger.documents?.panCardPhoto) {
          return res.status(400).json({ 
            error: 'Lead passenger PAN card photo is required' 
          });
        }
        if (!leadPassenger.documents?.passportFront) {
          return res.status(400).json({ 
            error: 'Lead passenger passport front is required' 
          });
        }
        if (!leadPassenger.documents?.passportBack) {
          return res.status(400).json({ 
            error: 'Lead passenger passport back is required' 
          });
        }
      }

      // Validate other passengers
      for (const passenger of validatedData.passengers.filter(p => !p.isLeadPassenger)) {
        if (!passenger.documents?.passportFront) {
          return res.status(400).json({ 
            error: `Passport front is required for ${passenger.fullName || 'passenger'}` 
          });
        }
        if (!passenger.documents?.passportBack) {
          return res.status(400).json({ 
            error: `Passport back is required for ${passenger.fullName || 'passenger'}` 
          });
        }
      }
    }

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.travelDetails) {
      return res.status(400).json({ error: 'Travel details are required before adding passengers' });
    }

    if (!booking.service?.party?.partyName) {
      return res.status(400).json({ error: 'Party information is missing from the booking' });
    }

    // Check if TripInfo already exists for this booking
    const existingTripInfo = await prisma.tripInfo.findUnique({
      where: { bookingId },
    });

    if (existingTripInfo) {
      return res.status(400).json({ error: 'Trip info already exists for this booking' });
    }

    // For group bookings, we don't need to validate lead passenger count
    if (!isGroupBooking) {
      // Ensure exactly one lead passenger for regular bookings
      const leadPassengers = validatedData.passengers.filter(p => p.isLeadPassenger);
      if (leadPassengers.length !== 1) {
        return res.status(400).json({ error: 'Exactly one lead passenger is required' });
      }
    }

    // Determine initial status based on hasGroupNumber and accommodationType
    let initialStatus: 'pending' | 'group_assigned' | 'voucher';
    
    if (!booking.hasGroupNumber) {
      initialStatus = 'pending';
    } else if (booking.accommodationType === 'iqama') {
      initialStatus = 'group_assigned';
    } else if (booking.accommodationType === 'hotel') {
      initialStatus = 'voucher';
    } else {
      // Fallback to pending if accommodation type is not set
      initialStatus = 'pending';
    }

    console.log('🚀 Creating TripInfo for booking:', {
      bookingId,
      partyName: booking.service.party.partyName,
      initialStatus,
      hasGroupNumber: booking.hasGroupNumber,
      accommodationType: booking.accommodationType,
      passengerCount: validatedData.passengerCount,
    });

    // Perform all operations in a transaction to ensure data consistency
    const [updatedBooking, passengers, tripInfo] = await prisma.$transaction(async (tx) => {
      // Update booking with passenger count and status
      const updatedBooking = await tx.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          passengerCount: validatedData.passengerCount,
          status: initialStatus,
        },
      });

      // Create passengers
      const passengers = await Promise.all(
        validatedData.passengers.map(passenger =>
          tx.umrahPassenger.create({
            data: {
              bookingId,
              fullName: passenger.fullName,
              isLeadPassenger: isGroupBooking ? true : passenger.isLeadPassenger, // Group bookings always have lead passenger
            },
          })
        )
      );

      // Create TripInfo entry
      const tripInfo = await tx.tripInfo.create({
        data: {
          bookingId,
          groupNumber: booking.groupNumber,
          groupName: booking.groupName,
          partyName: booking.service.party.partyName,
          arrivalDate: booking.travelDetails!.arrivalDate,
          departureDate: booking.travelDetails!.departureDate,
          iqamaNumber: booking.accommodationDetails?.iqamaNumber,
          iqamaHolderName: booking.accommodationDetails?.iqamaName,
          iqamaHolderDob: booking.accommodationDetails?.iqamaDob,
          iqamaHolderMobile: booking.accommodationDetails?.iqamaMobile,
          iqamaNationalShortAddress: booking.accommodationDetails?.iqamaNationalShortAddress,
          updatedBy: user.id,
          status: initialStatus,
        },
      });

      // Create status history entry
      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          oldStatus: null,
          newStatus: initialStatus,
          changedBy: user.id,
          reason: 'Booking created',
        },
      });

      return [updatedBooking, passengers, tripInfo];
    });

    console.log('✅ TripInfo created successfully:', {
      tripInfoId: tripInfo.id,
      bookingId,
      status: tripInfo.status,
    });

    res.json({
      message: 'Booking completed successfully',
      data: {
        bookingId,
        passengerCount: validatedData.passengerCount,
        passengers,
        tripInfo,
        status: initialStatus,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('❌ Error in step 4 (Umrah Visa Booking):', error);
    console.error('❌ Booking ID:', req.params.bookingId);
    console.error('❌ User ID:', (req as any).user?.id);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ error: 'Failed to complete step 4' });
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

    const travel = await prisma.umrahTravelDetails.upsert({
      where: { bookingId },
      update: {
        arrivalDate: arrivalDate ?? undefined,
        arrivalTime: arrivalTime ?? undefined,
        arrivalFlightNumber: arrivalFlightNumber ?? undefined,
        departureDate: departureDate ?? undefined,
        departureTime: departureTime ?? undefined,
        departureFlightNumber: departureFlightNumber ?? undefined,
      },
      create: {
        bookingId,
        arrivalDate: arrivalDate ?? new Date(),
        arrivalTime: arrivalTime ?? new Date(),
        arrivalFlightNumber: arrivalFlightNumber ?? '',
        departureDate: departureDate ?? new Date(),
        departureTime: departureTime ?? new Date(),
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

    // Get airport details
    const airport = await prisma.airportMaster.findUnique({
      where: { id: airportId },
    });

    if (!airport) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    // Check if this airport requires transport selection
    const needsTransport = ['JED', 'MED'].includes(airport.airportCode);

    if (!needsTransport) {
      return res.json({
        requiresTransport: false,
        transportOptions: [],
      });
    }

    // Find the destination that matches the airport's city
    const fromDestination = await findDestinationByCity(airport.city);

    if (!fromDestination) {
      console.warn(`No destination found for airport city: ${airport.city}`);
      return res.json({
        requiresTransport: true,
        airport,
        transportOptions: [],
        message: `No destination found for city: ${airport.city}`,
      });
    }

    // Get available transport options FROM this location
    const transportOptions = await prisma.transportMaster.findMany({
      where: {
        fromLocationId: fromDestination.id,
        isActive: true,
      },
      include: {
        fromLocation: true,
        toLocation: true,
      },
      orderBy: [
        { toLocation: { destinationName: 'asc' } },
        { vehicleType: 'asc' },
        { paxCount: 'asc' },
      ],
    });

    res.json({
      requiresTransport: true,
      airport,
      fromLocation: fromDestination,
      transportOptions,
    });
  } catch (error) {
    console.error('Error fetching transport options:', error);
    res.status(500).json({ error: 'Failed to fetch transport options' });
  }
});

// Masters: GET destinations (locations)
router.get('/masters/destinations', authenticate, async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const rows = await prisma.destinationMaster.findMany({
      where: q ? { destinationName: { contains: q, mode: 'insensitive' } } : undefined,
      orderBy: { destinationName: 'asc' },
      take: 100,
    });
    res.json({ destinations: rows });
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({ error: 'Failed to fetch destinations' });
  }
});

// Masters: GET hotels by destination
router.get('/masters/hotels', authenticate, async (req, res) => {
  try {
    const locationId = req.query.locationId as string | undefined;
    const q = (req.query.q as string) || '';
    const rows = await prisma.hotelMaster.findMany({
      where: {
        ...(locationId ? { locationId } : {}),
        ...(q ? { hotelName: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { hotelName: 'asc' },
      take: 100,
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
    const rows = await prisma.airportMaster.findMany({
      where: q ? { airportName: { contains: q, mode: 'insensitive' } } : undefined,
      orderBy: { airportName: 'asc' },
      take: 100,
    });
    res.json({ airports: rows });
  } catch (error) {
    console.error('Error fetching airports:', error);
    res.status(500).json({ error: 'Failed to fetch airports' });
  }
});

// GET /api/umrah-visa/hotels/:locationId - Get hotels by location
router.get('/hotels/:locationId', authenticate, async (req, res) => {
  try {
    const { locationId } = req.params;

    const hotels = await prisma.hotelMaster.findMany({
      where: {
        locationId: locationId,
        isActive: true,
      },
      include: {
        location: true,
      },
      orderBy: [
        { hotelName: 'asc' },
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

    // Update booking and trip info
    const [updatedBooking, updatedTripInfo] = await prisma.$transaction([
      prisma.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          groupNumber,
          groupName,
          hasGroupNumber: true,
          status: nextStatus,
        },
      }),
      prisma.tripInfo.update({
        where: { bookingId },
        data: {
          groupNumber,
          groupName,
          status: nextStatus,
          updatedBy: user.id,
        },
      }),
      prisma.bookingStatusHistory.create({
        data: {
          bookingId,
          oldStatus: 'documents_downloaded',
          newStatus: nextStatus,
          changedBy: user.id,
          reason: 'Group data added',
        },
      }),
    ]);

    res.json({
      message: 'Group data added successfully',
      data: {
        booking: updatedBooking,
        tripInfo: updatedTripInfo,
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

    // Update trip info - mark as downloaded and change status
    const updatedTripInfo = await prisma.$transaction([
      prisma.tripInfo.update({
        where: { bookingId },
        data: {
          documentsDownloadCount: { increment: 1 },
          documentsDownloadedAt: new Date(),
          documentsDownloadedBy: user.id,
          status: 'documents_downloaded',
          updatedBy: user.id,
        },
      }),
      prisma.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          status: 'documents_downloaded',
        },
      }),
      prisma.bookingStatusHistory.create({
        data: {
          bookingId,
          oldStatus: 'pending',
          newStatus: 'documents_downloaded',
          changedBy: user.id,
          reason: 'Documents downloaded',
        },
      }),
    ]);

    res.json({
      message: 'Documents download tracked successfully',
      data: {
        documents: allDocuments,
        tripInfo: updatedTripInfo[0],
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

    // Update trip info with confirmation image and change status
    const [updatedTripInfo] = await prisma.$transaction([
      prisma.tripInfo.update({
        where: { bookingId },
        data: {
          confirmationImagePath,
          confirmationUploadedAt: new Date(),
          status: nextStatus,
          updatedBy: user.id,
        },
      }),
      prisma.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          status: nextStatus,
        },
      }),
      prisma.bookingStatusHistory.create({
        data: {
          bookingId,
          oldStatus: 'group_assigned',
          newStatus: nextStatus,
          changedBy: user.id,
          reason: 'Confirmation image uploaded',
        },
      }),
    ]);

    res.json({
      message: 'Confirmation uploaded successfully',
      data: {
        tripInfo: updatedTripInfo,
      },
    });
  } catch (error) {
    console.error('Error uploading confirmation:', error);
    res.status(500).json({ error: 'Failed to upload confirmation' });
  }
});

// POST /api/umrah-visa/:bookingId/generate-voucher - Generate transport voucher
router.post('/:bookingId/generate-voucher', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can generate voucher
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can generate voucher' });
    }

    // Check if booking exists
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: { tripInfo: true, transportBookings: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.tripInfo) {
      return res.status(404).json({ error: 'Trip info not found' });
    }

    if (booking.tripInfo.status !== 'voucher') {
      return res.status(400).json({ 
        error: 'Voucher can only be generated when status is voucher',
        currentStatus: booking.tripInfo.status 
      });
    }

    // Update booking status to bill after voucher generation
    const [updatedBooking, updatedTripInfo] = await prisma.$transaction([
      prisma.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          status: 'bill',
          voucherGeneratedAt: new Date(),
          voucherGeneratedBy: user.id,
        },
      }),
      prisma.tripInfo.update({
        where: { bookingId },
        data: {
          status: 'bill',
          updatedBy: user.id,
        },
      }),
      prisma.bookingStatusHistory.create({
        data: {
          bookingId,
          oldStatus: 'voucher',
          newStatus: 'bill',
          changedBy: user.id,
          reason: 'Voucher generated',
        },
      }),
    ]);

    res.json({
      message: 'Voucher generated successfully',
      data: {
        booking: updatedBooking,
        tripInfo: updatedTripInfo,
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

// POST /api/umrah-visa/group/step1 - Group Step 1: Group Number and Group Name
router.post('/group/step1', authenticate, async (req, res) => {
  try {
    const { partyId } = req.body;
    const validatedData = groupStep1Schema.parse(req.body);

    if (!partyId) {
      return res.status(400).json({ error: 'Party ID is required' });
    }

    // Create service first
    const service = await prisma.service.create({
      data: {
        serviceType: 'umrah_visa',
        partyId,
        status: 'pending',
      },
    });

    // Create basic booking with group visa type
    const booking = await prisma.umrahVisaBooking.create({
      data: {
        serviceId: service.id,
        groupNumber: validatedData.groupNumber,
        groupName: validatedData.groupName,
        hasGroupNumber: true, // Always true for group bookings
        passengerCount: 1, // Will be updated in step 4
        visaType: 'group_visa', // Set visa type to group
        accommodationType: 'hotel', // Always hotel for group bookings
      },
    });

    res.status(201).json({
      message: 'Group booking step 1 completed successfully',
      bookingId: booking.id,
      serviceId: service.id,
      data: booking,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in group booking step 1:', error);
    res.status(500).json({ error: 'Failed to complete step 1' });
  }
});

// POST /api/umrah-visa/group/step2/:bookingId - Group Step 2: Travel Details
router.post('/group/step2/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    console.log('🚀 Group booking step 2 request for booking:', bookingId);
    
    const validatedData = step2Schema.parse(req.body);

    // Check if booking exists and is a group booking
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.visaType !== 'group_visa') {
      return res.status(400).json({ error: 'This endpoint is only for group visa bookings' });
    }

    // Validate date range (80 days max)
    if (!validateDateRange(validatedData.arrivalDate, validatedData.departureDate)) {
      return res.status(400).json({ error: 'Travel duration cannot exceed 80 days' });
    }

    // Check if arrival airport requires transport selection
    const needsTransport = await requiresTransport(validatedData.arrivalAirportId);
    
    if (needsTransport && (!validatedData.transportBookings || validatedData.transportBookings.length === 0)) {
      return res.status(400).json({ 
        error: 'Transport selection is required for Jeddah/Medina airports',
        requiresTransport: true 
      });
    }

    // Create travel details
    const travelDetails = await prisma.umrahTravelDetails.create({
      data: {
        bookingId,
        arrivalDate: validatedData.arrivalDate,
        arrivalTime: validatedData.arrivalTime,
        arrivalAirportId: validatedData.arrivalAirportId,
        arrivalFlightNumber: validatedData.arrivalFlightNumber,
        departureDate: validatedData.departureDate,
        departureTime: validatedData.departureTime,
        departureAirportId: validatedData.departureAirportId,
        departureFlightNumber: validatedData.departureFlightNumber,
      },
    });

    // Create transport bookings if provided
    let transportBookings: any[] = [];
    const hasTransportation = validatedData.transportBookings && validatedData.transportBookings.length > 0;
    
    if (hasTransportation && validatedData.transportBookings) {
      transportBookings = await Promise.all(
        validatedData.transportBookings.map(transport =>
          prisma.umrahTransportBooking.create({
            data: {
              bookingId,
              fromLocationId: transport.fromLocationId,
              toLocationId: transport.toLocationId,
              vehicleType: transport.vehicleType,
              paxCount: transport.paxCount,
              price: transport.price,
              travelDate: transport.travelDate,
            },
          })
        )
      );
    }

    // Update booking with hasTransportation flag
    await prisma.umrahVisaBooking.update({
      where: { id: bookingId },
      data: {
        hasTransportation,
      },
    });

    res.json({
      message: 'Group booking step 2 completed successfully',
      data: {
        travelDetails,
        transportBookings,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in group booking step 2:', error);
    res.status(500).json({ error: 'Failed to complete step 2' });
  }
});

// POST /api/umrah-visa/group/step3/:bookingId - Group Step 3: Hotel Accommodation
router.post('/group/step3/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    console.log('🚀 Group booking step 3 request for booking:', bookingId);
    
    // For group bookings, we expect hotel bookings array
    const { hotelBookings } = req.body;

    if (!hotelBookings || !Array.isArray(hotelBookings) || hotelBookings.length === 0) {
      return res.status(400).json({ error: 'At least one hotel booking is required' });
    }

    // Check if booking exists and is a group booking
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.visaType !== 'group_visa') {
      return res.status(400).json({ error: 'This endpoint is only for group visa bookings' });
    }

    // Create accommodation details (always hotel for group bookings)
    const accommodationDetails = await prisma.umrahAccommodationDetails.create({
      data: {
        bookingId,
        accommodationType: 'hotel',
      },
    });

    // Create hotel bookings
    const createdHotelBookings = await Promise.all(
      hotelBookings.map((hotel: any) =>
        prisma.umrahHotelBooking.create({
          data: {
            accommodationId: accommodationDetails.id,
            locationId: hotel.locationId,
            hotelId: hotel.hotelId,
            checkInDate: new Date(hotel.checkInDate),
            checkOutDate: new Date(hotel.checkOutDate),
          },
        })
      )
    );

    res.json({
      message: 'Group booking step 3 completed successfully',
      data: {
        accommodationDetails,
        hotelBookings: createdHotelBookings,
      },
    });
  } catch (error) {
    console.error('Error in group booking step 3:', error);
    res.status(500).json({ error: 'Failed to complete step 3' });
  }
});

// POST /api/umrah-visa/group/step4/:bookingId - Group Step 4: Passengers & Documents
router.post('/group/step4/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { passengerCount, passengers } = req.body;
    
    console.log('🚀 Group booking step 4 request for booking:', bookingId);

    // Check if booking exists and is a group booking
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        accommodationDetails: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.visaType !== 'group_visa') {
      return res.status(400).json({ error: 'This endpoint is only for group visa bookings' });
    }

    const parsedPassengerCount = parseInt(passengerCount);
    const parsedPassengers = JSON.parse(passengers);

    if (parsedPassengerCount < 1 || parsedPassengerCount > 50) {
      return res.status(400).json({ error: 'Passenger count must be between 1 and 50' });
    }

    if (parsedPassengers.length !== parsedPassengerCount) {
      return res.status(400).json({ error: 'Number of passengers must match passenger count' });
    }

    const leadPassengers = parsedPassengers.filter((p: any) => p.isLeadPassenger);
    if (leadPassengers.length !== 1) {
      return res.status(400).json({ error: 'Exactly one lead passenger is required' });
    }

    // Validate passenger names
    for (const passenger of parsedPassengers) {
      if (!passenger.fullName || passenger.fullName.trim() === '') {
        return res.status(400).json({ error: 'All passengers must have a full name' });
      }
    }

    // Process uploaded files (Development Mode - Skip file processing)
    // const files = req.files as Express.Multer.File[];
    // const filesByField: { [key: string]: Express.Multer.File } = {};
    // 
    // files.forEach(file => {
    //   filesByField[file.fieldname] = file;
    // });

    // Create passengers (Development Mode - No document processing)
    const createdPassengers = await Promise.all(
      parsedPassengers.map(async (passenger: any) => {
        // Create passenger without documents
        return await prisma.umrahPassenger.create({
          data: {
            bookingId,
            fullName: passenger.fullName.trim(),
            isLeadPassenger: passenger.isLeadPassenger,
          },
        });
      })
    );

    // Update booking with passenger count and status
    // For group bookings with hotel accommodation, status goes directly to "voucher"
    const updatedBooking = await prisma.umrahVisaBooking.update({
      where: { id: bookingId },
      data: {
        passengerCount: parsedPassengerCount,
        status: 'voucher', // Direct to voucher status for group bookings
      },
    });

    // Update service status
    await prisma.service.update({
      where: { id: booking.serviceId },
      data: {
        status: 'completed',
      },
    });

    res.json({
      message: 'Group Umrah visa booking completed successfully',
      data: {
        booking: updatedBooking,
        passengers: createdPassengers,
        passengerCount: parsedPassengerCount,
        passengersCreated: createdPassengers.length
      },
    });
  } catch (error) {
    console.error('Error in group booking step 4:', error);
    res.status(500).json({ error: 'Failed to complete step 4' });
  }
});

export default router;