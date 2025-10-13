import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuthRequest, CreateCurrencyMasterRequest, UpdateCurrencyMasterRequest } from '../types';

const router = Router();

const createCurrencyMasterValidation = [
  body('currencyCode').isString().notEmpty().trim().isLength({ min: 3, max: 3 }),
  body('currencyName').isString().notEmpty().trim(),
  body('symbol').isString().notEmpty().trim(),
];

const updateCurrencyMasterValidation = [
  body('currencyCode').isString().notEmpty().trim().isLength({ min: 3, max: 3 }).optional(),
  body('currencyName').isString().notEmpty().trim().optional(),
  body('symbol').isString().notEmpty().trim().optional(),
  body('isActive').isBoolean().optional(),
];

// Create Currency Master
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createCurrencyMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currencyCode, currencyName, symbol } = req.body as CreateCurrencyMasterRequest;

    const existingCurrency = await prisma.currencyMaster.findUnique({
      where: { currencyCode },
    });

    if (existingCurrency) {
      return res.status(400).json({ error: 'Currency with this code already exists' });
    }

    const currencyMaster = await prisma.currencyMaster.create({
      data: {
        currencyCode,
        currencyName,
        symbol,
      },
    });

    res.status(201).json({ currencyMaster });
  })
);

// Get all Currency Masters
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
        { currencyName: { contains: search, mode: 'insensitive' } },
        { currencyCode: { contains: search, mode: 'insensitive' } },
        { symbol: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = String(isActive).toLowerCase() === 'true';
    }

    const [currencyMasters, total] = await Promise.all([
      prisma.currencyMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { currencyName: 'asc' },
      }),
      prisma.currencyMaster.count({ where }),
    ]);

    res.json({
      currencyMasters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get active currencies for dropdowns
router.get(
  '/active',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const currencyMasters = await prisma.currencyMaster.findMany({
      where: { isActive: true },
      orderBy: { currencyName: 'asc' },
      select: {
        id: true,
        currencyCode: true,
        currencyName: true,
        symbol: true,
      },
    });

    res.json({ currencyMasters });
  })
);

// Get Currency Master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const currencyMaster = await prisma.currencyMaster.findUnique({
      where: { id },
    });

    if (!currencyMaster) {
      return res.status(404).json({ error: 'Currency Master not found' });
    }

    res.json({ currencyMaster });
  })
);

// Update Currency Master
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  updateCurrencyMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { currencyCode, currencyName, symbol, isActive } = req.body as UpdateCurrencyMasterRequest;

    const currencyMaster = await prisma.currencyMaster.update({
      where: { id },
      data: {
        currencyCode,
        currencyName,
        symbol,
        isActive,
      },
    });

    res.json({ currencyMaster });
  })
);

// Toggle Currency Master status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const currencyMaster = await prisma.currencyMaster.findUnique({
      where: { id },
    });

    if (!currencyMaster) {
      return res.status(404).json({ error: 'Currency Master not found' });
    }

    const updatedCurrencyMaster = await prisma.currencyMaster.update({
      where: { id },
      data: { isActive: !currencyMaster.isActive },
    });

    res.json({ currencyMaster: updatedCurrencyMaster });
  })
);

// Delete Currency Master
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await prisma.currencyMaster.delete({
      where: { id },
    });
    res.status(204).send(); // No Content
  })
);

export default router;
