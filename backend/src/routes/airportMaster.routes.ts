import { Router } from 'express';
import { PrismaClient, LocationType } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Flight number validation regex: 2 letters + dash + up to 4 numbers (e.g., SV-1234)
const FLIGHT_NUMBER_REGEX = /^[A-Z]{2}-\d{1,4}$/;

// Validation schemas
const createAirportSchema = z.object({
  code: z.string().min(3).max(10).toUpperCase(),
  name: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  countryId: z.string().uuid(),
  isActive: z.boolean().optional(),
});

const updateAirportSchema = z.object({
  code: z.string().min(3).max(10).toUpperCase().optional(),
  name: z.string().min(1).max(255).optional(),
  city: z.string().min(1).max(100).optional(),
  countryId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

const flightNumberSchema = z.object({
  flightNumber: z.string().regex(FLIGHT_NUMBER_REGEX, 'Flight number must be in format: XX-1234 (2 letters, dash, 1-4 numbers)'),
});

// Helper function to transform LocationMaster to Airport format for backward compatibility
const transformLocationToAirport = (location: any) => ({
  id: location.id,
  airportCode: location.code,
  airportName: location.name,
  city: location.city,
  country: location.country?.countryName || 'Saudi Arabia',
  isActive: location.isActive,
  createdAt: location.createdAt,
  updatedAt: location.updatedAt,
  _count: location._count,
});

// GET /api/airport-masters - Get all airports
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      locationType: 'AIRPORT' as LocationType,
    };
    
    if (search) {
      where.OR = [
        { code: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
        { city: { contains: search as string, mode: 'insensitive' } },
        { country: { countryName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [locations, total] = await Promise.all([
      prisma.locationMaster.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { code: 'asc' },
        include: {
          country: {
            select: {
              countryName: true,
            },
          },
        },
      }),
      prisma.locationMaster.count({ where }),
    ]);

    // Get flight counts for all locations
    const locationIds = locations.map(loc => loc.id);
    const [arrivalCounts, departureCounts] = await Promise.all([
      prisma.umrahTravelDetails.groupBy({
        by: ['arrivalAirportId'],
        where: { arrivalAirportId: { in: locationIds } },
        _count: true,
      }),
      prisma.umrahTravelDetails.groupBy({
        by: ['departureAirportId'],
        where: { departureAirportId: { in: locationIds } },
        _count: true,
      }),
    ]);

    // Create count maps
    const arrivalMap = new Map(arrivalCounts.map(c => [c.arrivalAirportId, c._count]));
    const departureMap = new Map(departureCounts.map(c => [c.departureAirportId, c._count]));

    // Transform to airport format for backward compatibility
    const airports = locations.map(loc => transformLocationToAirport({
      ...loc,
      _count: {
        arrivalFlights: arrivalMap.get(loc.id) || 0,
        departureFlights: departureMap.get(loc.id) || 0,
      },
    }));

    res.json({
      airports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching airports:', error);
    res.status(500).json({ error: 'Failed to fetch airports' });
  }
});

// GET /api/airport-masters/active - Get all active airports (for dropdowns)
router.get('/active', authenticate, async (req, res) => {
  try {
    const locations = await prisma.locationMaster.findMany({
      where: { 
        isActive: true,
        locationType: 'AIRPORT' as LocationType,
      },
      include: {
        country: {
          select: {
            countryName: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    // Transform to airport format for backward compatibility
    const airports = locations.map(loc => ({
      id: loc.id,
      airportCode: loc.code,
      airportName: loc.name,
      city: loc.city,
      country: loc.country?.countryName || 'Saudi Arabia',
    }));

    res.json(airports);
  } catch (error) {
    console.error('Error fetching active airports:', error);
    res.status(500).json({ error: 'Failed to fetch active airports' });
  }
});

// GET /api/airport-masters/:id - Get airport by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const location = await prisma.locationMaster.findUnique({
      where: { 
        id,
        locationType: 'AIRPORT' as LocationType,
      },
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

    if (!location) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    // Get flight counts
    const [arrivalCount, departureCount] = await Promise.all([
      prisma.umrahTravelDetails.count({ where: { arrivalAirportId: id } }),
      prisma.umrahTravelDetails.count({ where: { departureAirportId: id } }),
    ]);

    // Transform to airport format for backward compatibility
    const airport = transformLocationToAirport({
      ...location,
      _count: {
        arrivalFlights: arrivalCount,
        departureFlights: departureCount,
      },
    });

    res.json(airport);
  } catch (error) {
    console.error('Error fetching airport:', error);
    res.status(500).json({ error: 'Failed to fetch airport' });
  }
});

// POST /api/airport-masters - Create new airport
router.post('/', authenticate, async (req, res) => {
  try {
    const validatedData = createAirportSchema.parse(req.body);

    // Check if airport code already exists for AIRPORT type
    const existingLocation = await prisma.locationMaster.findUnique({
      where: { 
        code_locationType: {
          code: validatedData.code,
          locationType: 'AIRPORT' as LocationType,
        },
      },
    });

    if (existingLocation) {
      return res.status(400).json({ error: 'Airport code already exists' });
    }

    // Verify country exists
    const country = await prisma.countryMaster.findUnique({
      where: { id: validatedData.countryId },
    });

    if (!country) {
      return res.status(400).json({ error: 'Invalid country ID' });
    }

    const location = await prisma.locationMaster.create({
      data: {
        code: validatedData.code,
        name: validatedData.name,
        city: validatedData.city,
        locationType: 'AIRPORT' as LocationType,
        countryId: validatedData.countryId,
        isActive: validatedData.isActive ?? true,
      },
      include: {
        country: {
          select: {
            countryName: true,
          },
        },
      },
    });

    // Transform to airport format for backward compatibility
    const airport = transformLocationToAirport(location);

    res.status(201).json(airport);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error creating airport:', error);
    res.status(500).json({ error: 'Failed to create airport' });
  }
});

// PUT /api/airport-masters/:id - Update airport
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateAirportSchema.parse(req.body);

    // Check if airport exists
    const existingLocation = await prisma.locationMaster.findUnique({
      where: { 
        id,
        locationType: 'AIRPORT' as LocationType,
      },
    });

    if (!existingLocation) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    // Check if airport code is being changed and if it already exists
    if (validatedData.code && validatedData.code !== existingLocation.code) {
      const duplicateLocation = await prisma.locationMaster.findUnique({
        where: { 
          code_locationType: {
            code: validatedData.code,
            locationType: 'AIRPORT' as LocationType,
          },
        },
      });

      if (duplicateLocation) {
        return res.status(400).json({ error: 'Airport code already exists' });
      }
    }

    // Verify country if countryId is provided
    if (validatedData.countryId) {
      const country = await prisma.countryMaster.findUnique({
        where: { id: validatedData.countryId },
      });

      if (!country) {
        return res.status(400).json({ error: 'Invalid country ID' });
      }
    }

    const updateData: any = {};
    if (validatedData.code !== undefined) updateData.code = validatedData.code;
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.city !== undefined) updateData.city = validatedData.city;
    if (validatedData.countryId !== undefined) updateData.countryId = validatedData.countryId;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

    const location = await prisma.locationMaster.update({
      where: { id },
      data: updateData,
      include: {
        country: {
          select: {
            countryName: true,
          },
        },
      },
    });

    // Transform to airport format for backward compatibility
    const airport = transformLocationToAirport(location);

    res.json(airport);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error updating airport:', error);
    res.status(500).json({ error: 'Failed to update airport' });
  }
});

// DELETE /api/airport-masters/:id - Delete airport (soft delete by setting isActive to false)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if airport exists
    const existingLocation = await prisma.locationMaster.findUnique({
      where: { 
        id,
        locationType: 'AIRPORT' as LocationType,
      },
    });

    if (!existingLocation) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    // Check if airport is being used in any bookings
    const [arrivalCount, departureCount] = await Promise.all([
      prisma.umrahTravelDetails.count({ where: { arrivalAirportId: id } }),
      prisma.umrahTravelDetails.count({ where: { departureAirportId: id } }),
    ]);
    const totalUsage = arrivalCount + departureCount;
    if (totalUsage > 0) {
      // Soft delete - set isActive to false
      const location = await prisma.locationMaster.update({
        where: { id },
        data: { isActive: false },
      });
      
      // Transform to airport format for backward compatibility
      const airport = transformLocationToAirport(location);
      
      return res.json({ 
        message: 'Airport deactivated successfully (cannot be deleted as it is being used in bookings)',
        airport 
      });
    }

    // Hard delete if not being used
    await prisma.locationMaster.delete({
      where: { id },
    });

    res.json({ message: 'Airport deleted successfully' });
  } catch (error) {
    console.error('Error deleting airport:', error);
    res.status(500).json({ error: 'Failed to delete airport' });
  }
});

// POST /api/airport-masters/validate-flight - Validate flight number format
router.post('/validate-flight', authenticate, async (req, res) => {
  try {
    const validatedData = flightNumberSchema.parse(req.body);
    res.json({ 
      valid: true, 
      message: 'Flight number format is valid',
      flightNumber: validatedData.flightNumber 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Invalid flight number format', 
        details: error.issues,
        expectedFormat: 'XX-1234 (2 letters, dash, 1-4 numbers)'
      });
    }
    res.status(500).json({ error: 'Failed to validate flight number' });
  }
});

// GET /api/airport-masters/search/:query - Search airports by code or name
router.get('/search/:query', authenticate, async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;

    const locations = await prisma.locationMaster.findMany({
      where: {
        AND: [
          { isActive: true },
          { locationType: 'AIRPORT' as LocationType },
          {
            OR: [
              { code: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
              { city: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: {
        country: {
          select: {
            countryName: true,
          },
        },
      },
      take: Number(limit),
      orderBy: [
        { code: 'asc' },
        { name: 'asc' },
      ],
    });

    // Transform to airport format for backward compatibility
    const airports = locations.map(loc => ({
      id: loc.id,
      airportCode: loc.code,
      airportName: loc.name,
      city: loc.city,
      country: loc.country?.countryName || 'Saudi Arabia',
    }));

    res.json(airports);
  } catch (error) {
    console.error('Error searching airports:', error);
    res.status(500).json({ error: 'Failed to search airports' });
  }
});

export default router;
