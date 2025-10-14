import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuthRequest, CreateDestinationMasterRequest, UpdateDestinationMasterRequest } from '../types';

const router = Router();

const createDestinationMasterValidation = [
  body('destinationCode').isString().notEmpty().trim().isLength({ min: 2, max: 10 }),
  body('destinationName').isString().notEmpty().trim(),
  body('city').isString().notEmpty().trim(),
  body('country').isString().notEmpty().trim(),
];

const updateDestinationMasterValidation = [
  body('destinationCode').isString().notEmpty().trim().isLength({ min: 2, max: 10 }).optional(),
  body('destinationName').isString().notEmpty().trim().optional(),
  body('city').isString().notEmpty().trim().optional(),
  body('country').isString().notEmpty().trim().optional(),
  body('description').isString().optional(),
  body('isActive').isBoolean().optional(),
];

// Create Destination Master
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createDestinationMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { destinationCode, destinationName, city, country } = req.body as CreateDestinationMasterRequest;

    const existingDestination = await prisma.destinationMaster.findUnique({
      where: { destinationCode },
    });

    if (existingDestination) {
      return res.status(400).json({ error: 'Destination with this code already exists' });
    }

    const destinationMaster = await prisma.destinationMaster.create({
      data: {
        destinationCode,
        destinationName,
        city,
        country,
      },
    });

    res.status(201).json({ destinationMaster });
  })
);

// Get all Destination Masters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', search, isActive } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { destinationName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } },
        { destinationCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = String(isActive).toLowerCase() === 'true';
    }

    const [destinationMasters, total] = await Promise.all([
      prisma.destinationMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { destinationName: 'asc' },
        include: {
          hotels: {
            where: { isActive: true },
            select: { id: true, hotelName: true }
          }
        }
      }),
      prisma.destinationMaster.count({ where }),
    ]);

    res.json({
      destinationMasters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get active destinations for dropdowns
router.get(
  '/active',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const destinationMasters = await prisma.destinationMaster.findMany({
      where: { isActive: true },
      orderBy: { destinationName: 'asc' },
      select: {
        id: true,
        destinationCode: true,
        destinationName: true,
        city: true,
        country: true,
      },
    });

    res.json({ destinationMasters });
  })
);

// Get Destination Master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const destinationMaster = await prisma.destinationMaster.findUnique({
      where: { id },
      include: {
        hotels: {
          where: { isActive: true },
          select: { id: true, hotelName: true }
        }
      }
    });

    if (!destinationMaster) {
      return res.status(404).json({ error: 'Destination Master not found' });
    }

    res.json({ destinationMaster });
  })
);

// Update Destination Master
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  updateDestinationMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { destinationCode, destinationName, city, country, isActive } = req.body as UpdateDestinationMasterRequest;

    // Check if destination code already exists for a different destination
    const existingDestination = await prisma.destinationMaster.findFirst({
      where: {
        destinationCode,
        id: { not: id }
      }
    });

    if (existingDestination) {
      return res.status(400).json({ 
        error: 'Destination code already exists',
        details: `A destination with code '${destinationCode}' already exists`
      });
    }

    const destinationMaster = await prisma.destinationMaster.update({
      where: { id },
      data: {
        destinationCode,
        destinationName,
        city,
        country,
        isActive,
      },
    });

    res.json({ destinationMaster });
  })
);

// Toggle Destination Master status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const destinationMaster = await prisma.destinationMaster.findUnique({
      where: { id },
    });

    if (!destinationMaster) {
      return res.status(404).json({ error: 'Destination Master not found' });
    }

    const updatedDestinationMaster = await prisma.destinationMaster.update({
      where: { id },
      data: { isActive: !destinationMaster.isActive },
    });

    res.json({ destinationMaster: updatedDestinationMaster });
  })
);

// Delete Destination Master
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await prisma.destinationMaster.delete({
      where: { id },
    });
    res.status(204).send(); // No Content
  })
);

export default router;
