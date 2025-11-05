import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuthRequest } from '../types';

const router = Router();

// Validation middleware
const createCityMasterValidation = [
  body('name').isString().notEmpty().trim().isLength({ min: 2, max: 255 }),
  body('countryId').isUUID().withMessage('Valid country ID is required'),
  body('isActive').isBoolean().optional(),
];

const updateCityMasterValidation = [
  body('name').isString().notEmpty().trim().isLength({ min: 2, max: 255 }).optional(),
  body('countryId').isUUID().withMessage('Valid country ID is required').optional(),
  body('isActive').isBoolean().optional(),
];

// Create City Master
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createCityMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, countryId, isActive } = req.body;

    // Check if country exists
    const country = await prisma.countryMaster.findUnique({
      where: { id: countryId },
    });

    if (!country) {
      return res.status(400).json({ error: 'Country not found' });
    }

    // Check if city with same name already exists in this country
    const existingCity = await prisma.cityMaster.findFirst({
      where: {
        name: name.trim(),
        countryId,
      },
    });

    if (existingCity) {
      return res.status(400).json({ error: 'City with this name already exists in this country' });
    }

    const cityMaster = await prisma.cityMaster.create({
      data: {
        name: name.trim(),
        countryId,
        isActive: isActive ?? true,
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

    res.status(201).json({ cityMaster });
  })
);

// Get all City Masters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', search, isActive, countryId } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { country: { countryName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = String(isActive).toLowerCase() === 'true';
    }
    if (countryId) {
      where.countryId = countryId;
    }

    const [cityMasters, total] = await Promise.all([
      prisma.cityMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { name: 'asc' },
        include: {
          country: {
            select: {
              id: true,
              countryCode: true,
              countryName: true,
            },
          },
        },
      }),
      prisma.cityMaster.count({ where }),
    ]);

    res.json({
      cityMasters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get active City Masters only
router.get(
  '/active',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { countryId } = req.query;

    const where: any = { isActive: true };
    if (countryId) {
      where.countryId = countryId;
    }

    const cityMasters = await prisma.cityMaster.findMany({
      where,
      orderBy: { name: 'asc' },
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

    res.json({ cityMasters });
  })
);

// Get City Master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const cityMaster = await prisma.cityMaster.findUnique({
      where: { id },
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

    if (!cityMaster) {
      return res.status(404).json({ error: 'City Master not found' });
    }

    res.json({ cityMaster });
  })
);

// Update City Master
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  updateCityMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, countryId, isActive } = req.body;

    const existingCity = await prisma.cityMaster.findUnique({
      where: { id },
    });

    if (!existingCity) {
      return res.status(404).json({ error: 'City Master not found' });
    }

    // If countryId is being updated, verify it exists
    if (countryId) {
      const country = await prisma.countryMaster.findUnique({
        where: { id: countryId },
      });

      if (!country) {
        return res.status(400).json({ error: 'Country not found' });
      }
    }

    // If name or countryId is being updated, check for duplicates
    if (name || countryId) {
      const checkName = name?.trim() || existingCity.name;
      const checkCountryId = countryId || existingCity.countryId;

      const duplicateCity = await prisma.cityMaster.findFirst({
        where: {
          name: checkName,
          countryId: checkCountryId,
          id: { not: id },
        },
      });

      if (duplicateCity) {
        return res.status(400).json({ error: 'City with this name already exists in this country' });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (countryId !== undefined) updateData.countryId = countryId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const cityMaster = await prisma.cityMaster.update({
      where: { id },
      data: updateData,
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

    res.json({ cityMaster });
  })
);

// Toggle City Master status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const cityMaster = await prisma.cityMaster.findUnique({
      where: { id },
    });

    if (!cityMaster) {
      return res.status(404).json({ error: 'City Master not found' });
    }

    const updatedCityMaster = await prisma.cityMaster.update({
      where: { id },
      data: { isActive: !cityMaster.isActive },
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

    res.json({ cityMaster: updatedCityMaster });
  })
);

// Delete City Master
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // Check if city has related locations
    const relatedLocations = await prisma.locationMaster.findFirst({
      where: { cityId: id },
    });

    if (relatedLocations) {
      return res.status(400).json({
        error: 'Cannot delete city. It has associated locations.',
        details: 'Please remove or reassign all locations associated with this city before deleting.',
      });
    }

    await prisma.cityMaster.delete({
      where: { id },
    });

    res.status(204).send();
  })
);

export default router;

