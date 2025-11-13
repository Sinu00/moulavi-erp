import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuthRequest } from '../types';

const router = Router();

const createPricingMasterValidation = [
  body('partyId').isUUID().notEmpty().withMessage('Party ID is required'),
  body('cost').isFloat({ min: 0 }).withMessage('Cost must be a positive number'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('type').isIn(['umrah', 'others']).withMessage('Type must be either "umrah" or "others"'),
  body('isActive').isBoolean().optional(),
];

const updatePricingMasterValidation = [
  body('partyId').isUUID().optional(),
  body('cost').isFloat({ min: 0 }).optional(),
  body('price').isFloat({ min: 0 }).optional(),
  body('type').isIn(['umrah', 'others']).optional(),
  body('isActive').isBoolean().optional(),
];

// GET /api/pricing-masters - Get all pricing masters with pagination and filters
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', partyId, type, isActive } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (partyId) {
      where.partyId = partyId;
    }

    if (type && (type === 'umrah' || type === 'others')) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [pricingMasters, total] = await Promise.all([
      prisma.pricingMaster.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          party: {
            select: {
              id: true,
              partyName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.pricingMaster.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        pricingMasters,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  })
);

// GET /api/pricing-masters/:id - Get pricing master by ID
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const pricingMaster = await prisma.pricingMaster.findUnique({
      where: { id },
      include: {
        party: {
          select: {
            id: true,
            partyName: true,
            email: true,
          },
        },
      },
    });

    if (!pricingMaster) {
      return res.status(404).json({ error: 'Pricing master not found' });
    }

    res.json({
      success: true,
      data: pricingMaster,
    });
  })
);

// POST /api/pricing-masters - Create new pricing master
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createPricingMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { partyId, cost, price, type, isActive = true } = req.body;

    // Verify party exists
    const party = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!party) {
      return res.status(400).json({ error: 'Invalid party ID' });
    }

    const pricingMaster = await prisma.pricingMaster.create({
      data: {
        partyId,
        cost: parseFloat(cost),
        price: parseFloat(price),
        type,
        isActive,
      },
      include: {
        party: {
          select: {
            id: true,
            partyName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: pricingMaster,
      message: 'Pricing master created successfully',
    });
  })
);

// PUT /api/pricing-masters/:id - Update pricing master
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  updatePricingMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const { partyId, cost, price, type, isActive } = req.body;

    // Check if pricing master exists
    const existingPricingMaster = await prisma.pricingMaster.findUnique({
      where: { id },
    });

    if (!existingPricingMaster) {
      return res.status(404).json({ error: 'Pricing master not found' });
    }

    // If partyId is being updated, verify it exists
    if (partyId) {
      const party = await prisma.party.findUnique({
        where: { id: partyId },
      });

      if (!party) {
        return res.status(400).json({ error: 'Invalid party ID' });
      }
    }

    const updateData: any = {};
    if (partyId !== undefined) updateData.partyId = partyId;
    if (cost !== undefined) updateData.cost = parseFloat(cost);
    if (price !== undefined) updateData.price = parseFloat(price);
    if (type !== undefined) updateData.type = type;
    if (isActive !== undefined) updateData.isActive = isActive;

    const pricingMaster = await prisma.pricingMaster.update({
      where: { id },
      data: updateData,
      include: {
        party: {
          select: {
            id: true,
            partyName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: pricingMaster,
      message: 'Pricing master updated successfully',
    });
  })
);

// DELETE /api/pricing-masters/:id - Delete pricing master (soft delete by setting isActive to false)
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const pricingMaster = await prisma.pricingMaster.findUnique({
      where: { id },
    });

    if (!pricingMaster) {
      return res.status(404).json({ error: 'Pricing master not found' });
    }

    // Soft delete by setting isActive to false
    await prisma.pricingMaster.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Pricing master deleted successfully',
    });
  })
);

export default router;

