import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuthRequest, CreateHotelMasterRequest, UpdateHotelMasterRequest } from '../types';

const router = Router();

const createHotelMasterValidation = [
  body('hotelCode').isString().notEmpty().trim().isLength({ min: 2, max: 20 }),
  body('hotelName').isString().notEmpty().trim(),
  body('locationId').isString().notEmpty().trim(),
  body('isActive').isBoolean().optional(),
];

const updateHotelMasterValidation = [
  body('hotelCode').isString().notEmpty().trim().isLength({ min: 2, max: 20 }).optional(),
  body('hotelName').isString().notEmpty().trim().optional(),
  body('locationId').isString().notEmpty().trim().optional(),
  body('isActive').isBoolean().optional(),
];

// Create Hotel Master
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createHotelMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { hotelCode, hotelName, locationId, isActive } = req.body as CreateHotelMasterRequest;

    const existingHotel = await prisma.hotelMaster.findUnique({
      where: { hotelCode },
    });

    if (existingHotel) {
      return res.status(400).json({ error: 'Hotel with this code already exists' });
    }

    // Verify location (destination) exists
    const location = await prisma.destinationMaster.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return res.status(400).json({ error: 'Location not found' });
    }

    const hotelMaster = await prisma.hotelMaster.create({
      data: {
        hotelCode,
        hotelName,
        locationId,
        isActive: isActive ?? true,
      },
    });

    res.status(201).json({ hotelMaster });
  })
);

// Get all Hotel Masters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', search, isActive, locationId } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { hotelName: { contains: search, mode: 'insensitive' } },
        { hotelCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = String(isActive).toLowerCase() === 'true';
    }
    if (locationId) {
      where.locationId = locationId;
    }

    const [hotelMasters, total] = await Promise.all([
      prisma.hotelMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { hotelName: 'asc' },
        include: {
          location: {
            select: { id: true, destinationName: true, city: true }
          }
        }
      }),
      prisma.hotelMaster.count({ where }),
    ]);

    res.json({
      hotelMasters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get hotels by location (destination)
router.get(
  '/by-location/:locationId',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { locationId } = req.params;

    const hotelMasters = await prisma.hotelMaster.findMany({
      where: {
        locationId,
        isActive: true,
      },
      orderBy: { hotelName: 'asc' },
      select: {
        id: true,
        hotelCode: true,
        hotelName: true,
      },
    });

    res.json({ hotelMasters });
  })
);

// Get Hotel Master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const hotelMaster = await prisma.hotelMaster.findUnique({
      where: { id },
      include: {
        location: {
          select: { id: true, destinationName: true, city: true, country: true }
        }
      }
    });

    if (!hotelMaster) {
      return res.status(404).json({ error: 'Hotel Master not found' });
    }

    res.json({ hotelMaster });
  })
);

// Update Hotel Master
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  updateHotelMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { hotelCode, hotelName, locationId, isActive } = req.body as UpdateHotelMasterRequest;

    // Verify location exists if provided
    if (locationId) {
      const location = await prisma.destinationMaster.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        return res.status(400).json({ error: 'Location not found' });
      }
    }

    const hotelMaster = await prisma.hotelMaster.update({
      where: { id },
      data: {
        hotelCode,
        hotelName,
        locationId,
        isActive,
      },
    });

    res.json({ hotelMaster });
  })
);

// Toggle Hotel Master status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const hotelMaster = await prisma.hotelMaster.findUnique({
      where: { id },
    });

    if (!hotelMaster) {
      return res.status(404).json({ error: 'Hotel Master not found' });
    }

    const updatedHotelMaster = await prisma.hotelMaster.update({
      where: { id },
      data: { isActive: !hotelMaster.isActive },
    });

    res.json({ hotelMaster: updatedHotelMaster });
  })
);

// Delete Hotel Master
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await prisma.hotelMaster.delete({
      where: { id },
    });
    res.status(204).send(); // No Content
  })
);

export default router;
