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
  body('destinationId').isString().notEmpty().trim(),
  body('category').isString().notEmpty().trim(),
  body('capacity').isInt({ min: 1 }),
];

const updateHotelMasterValidation = [
  body('hotelCode').isString().notEmpty().trim().isLength({ min: 2, max: 20 }).optional(),
  body('hotelName').isString().notEmpty().trim().optional(),
  body('destinationId').isString().notEmpty().trim().optional(),
  body('category').isString().notEmpty().trim().optional(),
  body('capacity').isInt({ min: 1 }).optional(),
  body('amenities').isArray().optional(),
  body('description').isString().optional(),
  body('isActive').isBoolean().optional(),
];

// Create Hotel Master
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createHotelMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { hotelCode, hotelName, destinationId, category, capacity, amenities, description } = req.body as CreateHotelMasterRequest;

    const existingHotel = await prisma.hotelMaster.findUnique({
      where: { hotelCode },
    });

    if (existingHotel) {
      return res.status(400).json({ error: 'Hotel with this code already exists' });
    }

    // Verify destination exists
    const destination = await prisma.destinationMaster.findUnique({
      where: { id: destinationId },
    });

    if (!destination) {
      return res.status(400).json({ error: 'Destination not found' });
    }

    const hotelMaster = await prisma.hotelMaster.create({
      data: {
        hotelCode,
        hotelName,
        destinationId,
        category,
        capacity,
        amenities: amenities || [],
        description,
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
    const { page = '1', limit = '10', search, isActive, destinationId, category } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { hotelName: { contains: search, mode: 'insensitive' } },
        { hotelCode: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = String(isActive).toLowerCase() === 'true';
    }
    if (destinationId) {
      where.destinationId = destinationId;
    }
    if (category) {
      where.category = category;
    }

    const [hotelMasters, total] = await Promise.all([
      prisma.hotelMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { hotelName: 'asc' },
        include: {
          destination: {
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

// Get hotels by destination
router.get(
  '/by-destination/:destinationId',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { destinationId } = req.params;
    const { category } = req.query;

    const where: any = {
      destinationId,
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    const hotelMasters = await prisma.hotelMaster.findMany({
      where,
      orderBy: { hotelName: 'asc' },
      select: {
        id: true,
        hotelCode: true,
        hotelName: true,
        category: true,
        capacity: true,
        amenities: true,
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
        destination: {
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
    const { hotelCode, hotelName, destinationId, category, capacity, amenities, description, isActive } = req.body as UpdateHotelMasterRequest;

    // Verify destination exists if provided
    if (destinationId) {
      const destination = await prisma.destinationMaster.findUnique({
        where: { id: destinationId },
      });

      if (!destination) {
        return res.status(400).json({ error: 'Destination not found' });
      }
    }

    const hotelMaster = await prisma.hotelMaster.update({
      where: { id },
      data: {
        hotelCode,
        hotelName,
        destinationId,
        category,
        capacity,
        amenities,
        description,
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
