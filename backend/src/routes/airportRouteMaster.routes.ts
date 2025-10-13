import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuthRequest, CreateAirportRouteMasterRequest, UpdateAirportRouteMasterRequest } from '../types';

const router = Router();

const createAirportRouteMasterValidation = [
  body('routeCode').isString().notEmpty().trim().isLength({ min: 2, max: 20 }),
  body('routeName').isString().notEmpty().trim(),
  body('fromAirport').isString().notEmpty().trim(),
  body('toAirport').isString().notEmpty().trim(),
  body('fromDestinationId').isString().optional(),
  body('toDestinationId').isString().optional(),
];

const updateAirportRouteMasterValidation = [
  body('routeCode').isString().notEmpty().trim().isLength({ min: 2, max: 20 }).optional(),
  body('routeName').isString().notEmpty().trim().optional(),
  body('fromAirport').isString().notEmpty().trim().optional(),
  body('toAirport').isString().notEmpty().trim().optional(),
  body('fromDestinationId').isString().optional(),
  body('toDestinationId').isString().optional(),
  body('description').isString().optional(),
  body('isActive').isBoolean().optional(),
];

// Create Airport Route Master
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createAirportRouteMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { routeCode, routeName, fromAirport, toAirport, fromDestinationId, toDestinationId, description } = req.body as CreateAirportRouteMasterRequest;

    const existingRoute = await prisma.airportRouteMaster.findUnique({
      where: { routeCode },
    });

    if (existingRoute) {
      return res.status(400).json({ error: 'Airport route with this code already exists' });
    }

    // Verify destinations exist if provided
    if (fromDestinationId) {
      const fromDestination = await prisma.destinationMaster.findUnique({
        where: { id: fromDestinationId },
      });
      if (!fromDestination) {
        return res.status(400).json({ error: 'From destination not found' });
      }
    }

    if (toDestinationId) {
      const toDestination = await prisma.destinationMaster.findUnique({
        where: { id: toDestinationId },
      });
      if (!toDestination) {
        return res.status(400).json({ error: 'To destination not found' });
      }
    }

    const airportRouteMaster = await prisma.airportRouteMaster.create({
      data: {
        routeCode,
        routeName,
        fromAirport,
        toAirport,
        fromDestinationId,
        toDestinationId,
        description,
      },
    });

    res.status(201).json({ airportRouteMaster });
  })
);

// Get all Airport Route Masters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', search, isActive, fromAirport, toAirport } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { routeName: { contains: search, mode: 'insensitive' } },
        { routeCode: { contains: search, mode: 'insensitive' } },
        { fromAirport: { contains: search, mode: 'insensitive' } },
        { toAirport: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = String(isActive).toLowerCase() === 'true';
    }
    if (fromAirport) {
      where.fromAirport = fromAirport;
    }
    if (toAirport) {
      where.toAirport = toAirport;
    }

    const [airportRouteMasters, total] = await Promise.all([
      prisma.airportRouteMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { routeName: 'asc' },
        include: {
          fromDestination: {
            select: { id: true, destinationName: true, city: true }
          },
          toDestination: {
            select: { id: true, destinationName: true, city: true }
          }
        }
      }),
      prisma.airportRouteMaster.count({ where }),
    ]);

    res.json({
      airportRouteMasters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get active airport routes for dropdowns
router.get(
  '/active',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { fromAirport, toAirport } = req.query;

    const where: any = { isActive: true };
    if (fromAirport) {
      where.fromAirport = fromAirport;
    }
    if (toAirport) {
      where.toAirport = toAirport;
    }

    const airportRouteMasters = await prisma.airportRouteMaster.findMany({
      where,
      orderBy: { routeName: 'asc' },
      select: {
        id: true,
        routeCode: true,
        routeName: true,
        fromAirport: true,
        toAirport: true,
        fromDestination: {
          select: { id: true, destinationName: true, city: true }
        },
        toDestination: {
          select: { id: true, destinationName: true, city: true }
        }
      },
    });

    res.json({ airportRouteMasters });
  })
);

// Get Airport Route Master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const airportRouteMaster = await prisma.airportRouteMaster.findUnique({
      where: { id },
      include: {
        fromDestination: {
          select: { id: true, destinationName: true, city: true, country: true }
        },
        toDestination: {
          select: { id: true, destinationName: true, city: true, country: true }
        }
      }
    });

    if (!airportRouteMaster) {
      return res.status(404).json({ error: 'Airport Route Master not found' });
    }

    res.json({ airportRouteMaster });
  })
);

// Update Airport Route Master
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  updateAirportRouteMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { routeCode, routeName, fromAirport, toAirport, fromDestinationId, toDestinationId, description, isActive } = req.body as UpdateAirportRouteMasterRequest;

    // Verify destinations exist if provided
    if (fromDestinationId) {
      const fromDestination = await prisma.destinationMaster.findUnique({
        where: { id: fromDestinationId },
      });
      if (!fromDestination) {
        return res.status(400).json({ error: 'From destination not found' });
      }
    }

    if (toDestinationId) {
      const toDestination = await prisma.destinationMaster.findUnique({
        where: { id: toDestinationId },
      });
      if (!toDestination) {
        return res.status(400).json({ error: 'To destination not found' });
      }
    }

    const airportRouteMaster = await prisma.airportRouteMaster.update({
      where: { id },
      data: {
        routeCode,
        routeName,
        fromAirport,
        toAirport,
        fromDestinationId,
        toDestinationId,
        description,
        isActive,
      },
    });

    res.json({ airportRouteMaster });
  })
);

// Toggle Airport Route Master status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const airportRouteMaster = await prisma.airportRouteMaster.findUnique({
      where: { id },
    });

    if (!airportRouteMaster) {
      return res.status(404).json({ error: 'Airport Route Master not found' });
    }

    const updatedAirportRouteMaster = await prisma.airportRouteMaster.update({
      where: { id },
      data: { isActive: !airportRouteMaster.isActive },
    });

    res.json({ airportRouteMaster: updatedAirportRouteMaster });
  })
);

// Delete Airport Route Master
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await prisma.airportRouteMaster.delete({
      where: { id },
    });
    res.status(204).send(); // No Content
  })
);

export default router;
