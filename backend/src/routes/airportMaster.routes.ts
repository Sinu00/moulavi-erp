import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Flight number validation regex: 2 letters + dash + up to 4 numbers (e.g., SV-1234)
const FLIGHT_NUMBER_REGEX = /^[A-Z]{2}-\d{1,4}$/;

// Validation schemas
const createAirportSchema = z.object({
  airportCode: z.string().min(3).max(10).toUpperCase(),
  airportName: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
});

const updateAirportSchema = z.object({
  airportCode: z.string().min(3).max(10).toUpperCase().optional(),
  airportName: z.string().min(1).max(255).optional(),
  city: z.string().min(1).max(100).optional(),
  country: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

const flightNumberSchema = z.object({
  flightNumber: z.string().regex(FLIGHT_NUMBER_REGEX, 'Flight number must be in format: XX-1234 (2 letters, dash, 1-4 numbers)'),
});

// GET /api/airport-masters - Get all airports
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (search) {
      where.OR = [
        { airportCode: { contains: search as string, mode: 'insensitive' } },
        { airportName: { contains: search as string, mode: 'insensitive' } },
        { city: { contains: search as string, mode: 'insensitive' } },
        { country: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [airports, total] = await Promise.all([
      prisma.airportMaster.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { airportCode: 'asc' },
      }),
      prisma.airportMaster.count({ where }),
    ]);

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
    const airports = await prisma.airportMaster.findMany({
      where: { isActive: true },
      select: {
        id: true,
        airportCode: true,
        airportName: true,
        city: true,
        country: true,
      },
      orderBy: { airportCode: 'asc' },
    });

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

    const airport = await prisma.airportMaster.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            arrivalFlights: true,
            departureFlights: true,
          },
        },
      },
    });

    if (!airport) {
      return res.status(404).json({ error: 'Airport not found' });
    }

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

    // Check if airport code already exists
    const existingAirport = await prisma.airportMaster.findUnique({
      where: { airportCode: validatedData.airportCode },
    });

    if (existingAirport) {
      return res.status(400).json({ error: 'Airport code already exists' });
    }

    const airport = await prisma.airportMaster.create({
      data: validatedData,
    });

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
    const existingAirport = await prisma.airportMaster.findUnique({
      where: { id },
    });

    if (!existingAirport) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    // Check if airport code is being changed and if it already exists
    if (validatedData.airportCode && validatedData.airportCode !== existingAirport.airportCode) {
      const duplicateAirport = await prisma.airportMaster.findUnique({
        where: { airportCode: validatedData.airportCode },
      });

      if (duplicateAirport) {
        return res.status(400).json({ error: 'Airport code already exists' });
      }
    }

    const airport = await prisma.airportMaster.update({
      where: { id },
      data: validatedData,
    });

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
    const existingAirport = await prisma.airportMaster.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            arrivalFlights: true,
            departureFlights: true,
          },
        },
      },
    });

    if (!existingAirport) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    // Check if airport is being used in any bookings
    const totalUsage = existingAirport._count.arrivalFlights + existingAirport._count.departureFlights;
    if (totalUsage > 0) {
      // Soft delete - set isActive to false
      const airport = await prisma.airportMaster.update({
        where: { id },
        data: { isActive: false },
      });
      return res.json({ 
        message: 'Airport deactivated successfully (cannot be deleted as it is being used in bookings)',
        airport 
      });
    }

    // Hard delete if not being used
    await prisma.airportMaster.delete({
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

    const airports = await prisma.airportMaster.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { airportCode: { contains: query, mode: 'insensitive' } },
              { airportName: { contains: query, mode: 'insensitive' } },
              { city: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        airportCode: true,
        airportName: true,
        city: true,
        country: true,
      },
      take: Number(limit),
      orderBy: [
        { airportCode: 'asc' },
        { airportName: 'asc' },
      ],
    });

    res.json(airports);
  } catch (error) {
    console.error('Error searching airports:', error);
    res.status(500).json({ error: 'Failed to search airports' });
  }
});

export default router;
