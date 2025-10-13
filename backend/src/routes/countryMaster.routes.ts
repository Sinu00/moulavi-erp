import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuthRequest, CreateCountryMasterRequest, UpdateCountryMasterRequest } from '../types';

const router = Router();

const createCountryMasterValidation = [
  body('countryCode').isString().notEmpty().trim().isLength({ min: 2, max: 3 }),
  body('countryName').isString().notEmpty().trim(),
  body('nationality').isString().notEmpty().trim(),
];

const updateCountryMasterValidation = [
  body('countryCode').isString().notEmpty().trim().isLength({ min: 2, max: 3 }).optional(),
  body('countryName').isString().notEmpty().trim().optional(),
  body('nationality').isString().notEmpty().trim().optional(),
  body('isActive').isBoolean().optional(),
];

// Create Country Master
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createCountryMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { countryCode, countryName, nationality } = req.body as CreateCountryMasterRequest;

    const existingCountry = await prisma.countryMaster.findUnique({
      where: { countryCode },
    });

    if (existingCountry) {
      return res.status(400).json({ error: 'Country with this code already exists' });
    }

    const countryMaster = await prisma.countryMaster.create({
      data: {
        countryCode,
        countryName,
        nationality,
      },
    });

    res.status(201).json({ countryMaster });
  })
);

// Get all Country Masters
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
        { countryName: { contains: search, mode: 'insensitive' } },
        { nationality: { contains: search, mode: 'insensitive' } },
        { countryCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = String(isActive).toLowerCase() === 'true';
    }

    const [countryMasters, total] = await Promise.all([
      prisma.countryMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { countryName: 'asc' },
      }),
      prisma.countryMaster.count({ where }),
    ]);

    res.json({
      countryMasters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get active countries for dropdowns
router.get(
  '/active',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const countryMasters = await prisma.countryMaster.findMany({
      where: { isActive: true },
      orderBy: { countryName: 'asc' },
      select: {
        id: true,
        countryCode: true,
        countryName: true,
        nationality: true,
      },
    });

    res.json({ countryMasters });
  })
);

// Get Country Master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const countryMaster = await prisma.countryMaster.findUnique({
      where: { id },
    });

    if (!countryMaster) {
      return res.status(404).json({ error: 'Country Master not found' });
    }

    res.json({ countryMaster });
  })
);

// Update Country Master
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  updateCountryMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { countryCode, countryName, nationality, isActive } = req.body as UpdateCountryMasterRequest;

    const countryMaster = await prisma.countryMaster.update({
      where: { id },
      data: {
        countryCode,
        countryName,
        nationality,
        isActive,
      },
    });

    res.json({ countryMaster });
  })
);

// Toggle Country Master status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const countryMaster = await prisma.countryMaster.findUnique({
      where: { id },
    });

    if (!countryMaster) {
      return res.status(404).json({ error: 'Country Master not found' });
    }

    const updatedCountryMaster = await prisma.countryMaster.update({
      where: { id },
      data: { isActive: !countryMaster.isActive },
    });

    res.json({ countryMaster: updatedCountryMaster });
  })
);

// Delete Country Master
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await prisma.countryMaster.delete({
      where: { id },
    });
    res.status(204).send(); // No Content
  })
);

export default router;
