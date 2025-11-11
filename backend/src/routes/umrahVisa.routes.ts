import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma, findCityByName } from './umrahVisa/shared';

const router = Router();

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
        where.partyId = userParty.id;
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
      where.partyId = partyId;
    }
    
    if (status && status !== 'all') {
      // Handle both string and array values for status
      if (Array.isArray(status)) {
        // If status is an array, use Prisma's 'in' operator
        where.status = { in: status };
      } else {
        // If status is a single string, use it directly
        where.status = status;
      }
    }

    const [bookings, total] = await Promise.all([
      prisma.umrahVisaBooking.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          party: {
            select: {
              id: true,
              partyName: true,
              email: true,
              contactNumber: true,
            },
          },
          travelDetails: {
            include: {
              arrivalAirport: true,
              departureAirport: true,
            },
          },
          hotelBookings: {
            include: {
              hotel: true,
              location: true,
            },
          },
          sponsorIqamaDetails: true,
          umrahVisaProvider: {
            select: {
              id: true,
              partyName: true,
            },
          },
          passengers: {
            include: {
              documents: true,
            },
          },
          lastUpdatedByUser: {
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
        party: true,
        travelDetails: {
          include: {
            arrivalAirport: true,
            departureAirport: true,
          },
        },
        hotelBookings: {
          include: {
            location: true,
            hotel: true,
          },
          orderBy: {
            checkInDate: 'asc',
          },
        },
        sponsorIqamaDetails: true,
        transportBookings: {
          include: {
            transportMaster: {
              include: {
                route: {
                  include: {
                    city1: true,
                    city2: true,
                    city3: true,
                    city4: true,
                  },
                },
                vehicleType: true,
              },
            },
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

    // TransportMaster has been removed - return empty transport options
    // TODO: Implement alternative transport options retrieval if needed
    res.json({
      requiresTransport: true,
      airport,
      fromCity: fromCity,
      transportOptions: [],
      message: 'Transport options not available - TransportMaster has been removed',
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
