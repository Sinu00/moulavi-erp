import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

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
    if (user && user.role === 'party' && user.partyId) {
      where.service = {
        partyId: user.partyId,
      };
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

const step2Schema = z.object({
  arrivalDate: z.string().transform((str) => new Date(str)),
  arrivalAirportId: z.string().uuid(),
  arrivalFlightNumber: z.string().regex(FLIGHT_NUMBER_REGEX, 'Flight number must be in format: XX-1234'),
  departureDate: z.string().transform((str) => new Date(str)),
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
        passengerCount: 1, // Default, will be updated in step 3
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
        arrivalAirportId: validatedData.arrivalAirportId,
        arrivalFlightNumber: validatedData.arrivalFlightNumber,
        departureDate: validatedData.departureDate,
        departureAirportId: validatedData.departureAirportId,
        departureFlightNumber: validatedData.departureFlightNumber,
      },
    });

    // Create transport bookings if provided
    let transportBookings: any[] = [];
    if (validatedData.transportBookings && validatedData.transportBookings.length > 0) {
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

    // Check if booking exists
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Ensure exactly one lead passenger
    const leadPassengers = validatedData.passengers.filter(p => p.isLeadPassenger);
    if (leadPassengers.length !== 1) {
      return res.status(400).json({ error: 'Exactly one lead passenger is required' });
    }

    // Update booking with passenger count and status
    await prisma.umrahVisaBooking.update({
      where: { id: bookingId },
      data: {
        passengerCount: validatedData.passengerCount,
        status: 'pending',
      },
    });

    // Create passengers
    const passengers = await Promise.all(
      validatedData.passengers.map(passenger =>
        prisma.umrahPassenger.create({
          data: {
            bookingId,
            fullName: passenger.fullName,
            isLeadPassenger: passenger.isLeadPassenger,
          },
        })
      )
    );

    res.json({
      message: 'Booking completed successfully',
      data: {
        bookingId,
        passengerCount: validatedData.passengerCount,
        passengers,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in step 4:', error);
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
    const fromDestination = await prisma.destinationMaster.findFirst({
      where: {
        city: airport.city,
        isActive: true,
      },
    });

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

export default router;